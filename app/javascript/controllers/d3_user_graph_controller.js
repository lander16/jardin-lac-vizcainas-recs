import { Controller } from "@hotwired/stimulus"
import {
  buildPanelContainer,
  buildPanelLink,
  extractBookId,
  extractPatronId,
  mountForceGraph,
  renderEmptyGraph,
  renderGraphError,
  renderGraphLoading,
  resetGraphZoom,
  zoomGraphBy
} from "controllers/d3_graph_shared"

const USER_GRAPH_COLORS = {
  1: "#7c1933",
  2: "#56697a",
  3: "#486a54",
  4: "#856320"
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
        title: "No se pudo cargar el grafo de afinidad. Verifica tu conexión e intenta de nuevo.",
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
        : "Este lector aún no tiene conexiones suficientes para mostrar una red."
      renderEmptyGraph({ container: this.containerTarget, loadingTarget: loading, message })
      this.setZoomControlsEnabled(false)
      if (nodes.length === 1) this.inspectNode(nodes[0])
      return
    }

    this.graphInstance = mountForceGraph({
      container: this.containerTarget,
      loadingTarget: loading,
      data,
      svgAriaLabel: "Grafo interactivo de afinidad y red de lectura",
      nodeColors: USER_GRAPH_COLORS,
      nodeAriaLabel: (d) => {
        if (d.type === "target_user") return `Lector Principal: ${d.name}`
        if (d.type === "similar_user") return `Lector Afín: ${d.name}`
        return `Obra en Red: ${d.name}`
      },
      buildSimulation: (d3, graphData, width, height) => (
        d3.forceSimulation(graphData.nodes)
          .force("link", d3.forceLink(graphData.links).id((d) => d.id).distance((d) => {
            if (d.type === "checkout") return 60
            if (d.type === "similarity") return 120
            return 90
          }))
          .force("charge", d3.forceManyBody().strength(-250))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collide", d3.forceCollide().radius((d) => (d.radius || 10) + 5))
          .alphaDecay(0.05)
          .velocityDecay(0.4)
      ),
      linkStroke: (d) => (
        d.type === "checkout"
          ? "rgba(86,105,122,0.3)"
          : d.type === "similarity"
            ? "rgba(72,106,84,0.4)"
            : "rgba(133,99,32,0.32)"
      ),
      linkDasharray: (d) => d.type === "similarity" ? "4,4" : "none",
      linkWidth: (d) => Math.max(1, (d.value || 1) * 2.5),
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
    if (node.type === "target_user" || node.type === "similar_user") {
      const isTarget = node.type === "target_user"
      wrap = buildPanelContainer(
        "kicker-accent",
        "fa-solid fa-user",
        isTarget ? "Lector Principal" : "Lector Afín",
        node.name
      )

      if (node.jaccard) {
        const jaccard = document.createElement("div")
        jaccard.className = "graph-panel-metric"
        const jIcon = document.createElement("i")
        jIcon.className = "fa-solid fa-percent"
        jIcon.setAttribute("aria-hidden", "true")
        jaccard.append(jIcon, document.createTextNode(` ${Math.round(node.jaccard * 100)}% de afinidad Jaccard`))
        wrap.appendChild(jaccard)
      }

      const patronId = extractPatronId(node)
      wrap.appendChild(buildPanelLink({
        href: `/users/${encodeURIComponent(patronId)}`,
        className: "btn btn-primary graph-panel-action",
        text: "Ver Perfil de Recomendaciones",
        iconClass: "fa-solid fa-arrow-right"
      }))
    } else {
      const bookId = extractBookId(node)
      wrap = buildPanelContainer("kicker-slate", "fa-solid fa-book", "Obra en Red", node.name)

      if (node.author) {
        const author = document.createElement("div")
        author.className = "graph-panel-author"
        const aIcon = document.createElement("i")
        aIcon.className = "fa-solid fa-feather"
        aIcon.setAttribute("aria-hidden", "true")
        author.append(aIcon, document.createTextNode(` ${node.author}`))
        wrap.appendChild(author)
      }

      wrap.appendChild(buildPanelLink({
        href: `/books/${encodeURIComponent(bookId)}`,
        className: "btn btn-secondary graph-panel-action",
        text: "Ver Ficha del Libro",
        iconClass: "fa-solid fa-arrow-right"
      }))
    }

    this.panelTarget.replaceChildren(wrap)
  }
}
