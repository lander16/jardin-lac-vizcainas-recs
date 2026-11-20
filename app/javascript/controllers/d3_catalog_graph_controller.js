import { Controller } from "@hotwired/stimulus"
import {
  buildPanelContainer,
  buildPanelLink,
  extractBookId,
  mountForceGraph,
  renderEmptyGraph,
  renderGraphError,
  renderGraphLoading,
  resetGraphZoom,
  zoomGraphBy
} from "controllers/d3_graph_shared"

const CATALOG_GRAPH_COLORS = {
  1: "#7c1933",
  2: "#7d4f9b",
  3: "#56697a"
}

export default class extends Controller {
  static targets = ["container", "panel", "loading", "zoomControl"]
  static values = { url: String }

  connect() {
    if (!this.hasContainerTarget || !this.urlValue) return
    this.graphInstance = null
    this.abortController = null
    this.handleBeforeCache = () => this.cleanupGraph()
    document.addEventListener("turbo:before-cache", this.handleBeforeCache)
    this.loadGraph()
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this.handleBeforeCache)
    this.cleanupGraph()
  }

  cleanupGraph() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.graphInstance) {
      this.graphInstance.simulation.stop()
      this.graphInstance.resizeObserver.disconnect()
      this.graphInstance = null
    }
    if (this.hasContainerTarget) {
      this.containerTarget.replaceChildren()
    }
    this.setZoomControlsEnabled(false)
  }

  async loadGraph() {
    if (!this.hasContainerTarget) return

    this.cleanupGraph()
    this.abortController = new AbortController()
    renderGraphLoading(this.hasLoadingTarget ? this.loadingTarget : null)

    try {
      const response = await fetch(this.urlValue, {
        signal: this.abortController.signal,
        headers: { Accept: "application/json" }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      this.renderGraph(data)
    } catch (err) {
      if (err.name === "AbortError") return
      renderGraphError({
        container: this.containerTarget,
        loadingTarget: this.hasLoadingTarget ? this.loadingTarget : null,
        panelTarget: this.hasPanelTarget ? this.panelTarget : null,
        title: "No se pudo cargar el grafo de catálogo. Verifica tu conexión e intenta de nuevo.",
        onRetry: () => this.loadGraph()
      })
    } finally {
      this.abortController = null
    }
  }

  renderGraph(data) {
    const nodes = Array.isArray(data?.nodes) ? data.nodes : []
    const loading = this.hasLoadingTarget ? this.loadingTarget : null

    if (nodes.length <= 1) {
      const message = nodes.length === 0
        ? "No hay datos disponibles para construir este grafo."
        : "Esta obra aún no tiene autoridades compartidas suficientes para mostrar una red."
      renderEmptyGraph({ container: this.containerTarget, loadingTarget: loading, message })
      this.setZoomControlsEnabled(false)
      if (nodes.length === 1) this.inspectNode(nodes[0])
      return
    }

    this.graphInstance = mountForceGraph({
      container: this.containerTarget,
      loadingTarget: loading,
      data,
      svgAriaLabel: "Grafo interactivo de conexiones catalográficas",
      nodeColors: CATALOG_GRAPH_COLORS,
      nodeAriaLabel: (d) => (
        d.type === "authority"
          ? `Autoridad Catalogada: ${d.name}`
          : `Obra del Acervo: ${d.name}`
      ),
      buildSimulation: (d3, graphData, width, height) => (
        d3.forceSimulation(graphData.nodes)
          .force("link", d3.forceLink(graphData.links).id((d) => d.id).distance(80))
          .force("charge", d3.forceManyBody().strength(-200))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collide", d3.forceCollide().radius((d) => (d.radius || 10) + 4))
          .alphaDecay(0.05)
          .velocityDecay(0.4)
      ),
      linkStroke: () => "rgba(125,79,155,0.3)",
      linkDasharray: () => "none",
      linkWidth: () => 1.5,
      onSelectNode: (d) => this.inspectNode(d)
    })

    this.setZoomControlsEnabled(true)
  }

  zoomIn() {
    zoomGraphBy(this.graphInstance, 1.3)
  }

  zoomOut() {
    zoomGraphBy(this.graphInstance, 1 / 1.3)
  }

  resetZoom() {
    resetGraphZoom(this.graphInstance)
  }

  setZoomControlsEnabled(enabled) {
    this.zoomControlTargets.forEach((button) => {
      button.disabled = !enabled
    })
  }

  inspectNode(node) {
    if (!this.hasPanelTarget) return

    let wrap
    if (node.type === "authority") {
      wrap = buildPanelContainer(
        "kicker-authority",
        "fa-solid fa-tag",
        "Autoridad Catalogada",
        node.name
      )

      if (node.auth_type) {
        const typeEl = document.createElement("div")
        typeEl.className = "graph-panel-author"
        const strong = document.createElement("strong")
        strong.textContent = "Tipo:"
        typeEl.append(strong, document.createTextNode(` ${node.auth_type}`))
        wrap.appendChild(typeEl)
      }

      wrap.appendChild(buildPanelLink({
        href: `/catalog?q=${encodeURIComponent(node.name)}`,
        className: "btn btn-primary graph-panel-action",
        text: "Explorar en el Catálogo",
        iconClass: "fa-solid fa-arrow-right"
      }))
    } else {
      const bookId = extractBookId(node)
      wrap = buildPanelContainer("kicker-accent", "fa-solid fa-book", "Obra del Acervo", node.name)

      if (node.author) {
        const author = document.createElement("div")
        author.className = "graph-panel-author"
        const aIcon = document.createElement("i")
        aIcon.className = "fa-solid fa-feather"
        aIcon.setAttribute("aria-hidden", "true")
        author.append(aIcon, document.createTextNode(` ${node.author}`))
        wrap.appendChild(author)
      }

      const actions = document.createElement("div")
      actions.className = "graph-panel-actions"
      actions.append(
        buildPanelLink({
          href: `/books/${encodeURIComponent(bookId)}`,
          className: "btn btn-secondary graph-panel-action",
          text: "Ver Ficha de la Obra",
          iconClass: "fa-solid fa-arrow-right"
        }),
        buildPanelLink({
          href: `/catalog/graph/${encodeURIComponent(bookId)}`,
          className: "btn btn-primary graph-panel-action",
          text: "Ver Grafo de esta Obra",
          iconClass: "fa-solid fa-diagram-project"
        })
      )
      wrap.appendChild(actions)
    }

    this.panelTarget.replaceChildren(wrap)
  }
}
