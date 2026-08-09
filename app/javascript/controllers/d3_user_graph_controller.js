import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

export default class extends Controller {
  static targets = ["container", "panel", "loading"]
  static values = { url: String }

  connect() {
    if (!this.hasContainerTarget || !this.urlValue) return
    this.simulation = null
    this.loadGraph()
  }

  disconnect() {
    if (this.simulation) {
      this.simulation.stop()
      this.simulation = null
    }
  }

  async loadGraph() {
    try {
      if (this.hasLoadingTarget) this.loadingTarget.hidden = false
      const response = await fetch(this.urlValue)
      if (!response.ok) throw new Error("Failed to load graph data")
      const data = await response.json()
      this.renderGraph(data)
    } catch (err) {
      if (this.hasLoadingTarget) {
        this.loadingTarget.hidden = false
        this.loadingTarget.innerHTML = `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>No se pudo cargar el grafo</span>`
      }
      if (this.hasPanelTarget) {
        this.panelTarget.replaceChildren()
        const errEl = document.createElement("div")
        errEl.style.cssText = "padding:2rem; text-align:center; color:var(--color-accent);"
        errEl.textContent = `Error al cargar grafo: ${err.message}`
        this.panelTarget.appendChild(errEl)
      }
    }
  }

  renderGraph(data) {
    const container = this.containerTarget
    container.innerHTML = ""
    if (this.hasLoadingTarget) this.loadingTarget.hidden = true

    const width = container.clientWidth || 800
    const height = 550

    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])

    const g = svg.append("g")

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform))

    svg.call(zoom)

    // Colors per group
    const colors = {
      1: "#f43f5e", // Target user (crimson)
      2: "#56697a", // Target book (slate)
      3: "#52755e", // Similar user (sage)
      4: "#b38f4d"  // Collab book (gold)
    }

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(d => {
        if (d.type === "checkout") return 60
        if (d.type === "similarity") return 120
        return 90
      }))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => (d.radius || 10) + 5))
      .alphaDecay(0.05)
      .velocityDecay(0.4)
    this.simulation = simulation

    // Render links
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", d => d.type === "checkout" ? "rgba(86,105,122,0.3)" : d.type === "similarity" ? "rgba(82,117,94,0.4)" : "rgba(179,143,77,0.3)")
      .attr("stroke-dasharray", d => d.type === "similarity" ? "4,4" : "none")
      .attr("stroke-width", d => Math.max(1, (d.value || 1) * 2.5))

    // Render nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on("drag", (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }))

    node.append("circle")
      .attr("r", d => d.radius || 10)
      .attr("fill", d => colors[d.group] || "#7c1933")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)

    node.append("text")
      .text(d => d.name)
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("font-weight", d => d.group === 1 ? "700" : "500")
      .attr("fill", "var(--text-primary)")
      .style("pointer-events", "none")

    // Node click inspector
    node.on("click", (event, d) => {
      this.inspectNode(d)
    })

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      node
        .attr("transform", d => `translate(${d.x},${d.y})`)
    })
  }

  inspectNode(node) {
    if (!this.hasPanelTarget) return
    this.panelTarget.replaceChildren()

    const wrap = document.createElement("div")
    wrap.style.padding = "0.5rem"

    const label = document.createElement("div")
    label.style.cssText = "font-size:0.75rem; text-transform:uppercase; font-weight:700; margin-bottom:0.25rem;"

    const h3 = document.createElement("h3")
    h3.style.cssText = "font-family:var(--font-display); font-weight:700; margin:0 0 0.5rem 0;"

    if (node.type === "target_user" || node.type === "similar_user") {
      const isTarget = node.type === "target_user"
      label.style.color = "var(--color-accent)"
      h3.style.fontSize = "1.4rem"

      const labelIcon = document.createElement("i")
      labelIcon.className = "fa-solid fa-user"
      labelIcon.setAttribute("aria-hidden", "true")
      label.appendChild(labelIcon)
      label.appendChild(document.createTextNode(` ${isTarget ? "Lector Principal" : "Lector Afín"}`))

      h3.textContent = node.name

      wrap.appendChild(label)
      wrap.appendChild(h3)

      if (node.jaccard) {
        const jaccard = document.createElement("div")
        jaccard.style.cssText = "font-size:0.85rem; color:var(--color-sage); font-weight:600; margin-bottom:1rem;"
        const jIcon = document.createElement("i")
        jIcon.className = "fa-solid fa-percent"
        jIcon.setAttribute("aria-hidden", "true")
        jaccard.appendChild(jIcon)
        jaccard.appendChild(document.createTextNode(` ${Math.round(node.jaccard * 100)}% de afinidad Jaccard`))
        wrap.appendChild(jaccard)
      }

      const link = document.createElement("a")
      link.href = `/users/${node.id}`
      link.className = "btn btn-primary"
      link.style.cssText = "font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center;"
      link.appendChild(document.createTextNode("Ver Perfil de Recomendaciones "))
      const arrIcon = document.createElement("i")
      arrIcon.className = "fa-solid fa-arrow-right"
      arrIcon.setAttribute("aria-hidden", "true")
      link.appendChild(arrIcon)
      wrap.appendChild(link)
    } else {
      const bookId = node.id.replace("book_", "").replace("collab_book_", "")
      label.style.color = "var(--color-slate)"
      h3.style.fontSize = "1.3rem"

      const labelIcon = document.createElement("i")
      labelIcon.className = "fa-solid fa-book"
      labelIcon.setAttribute("aria-hidden", "true")
      label.appendChild(labelIcon)
      label.appendChild(document.createTextNode(" Obra en Red"))

      h3.textContent = node.name

      wrap.appendChild(label)
      wrap.appendChild(h3)

      if (node.author) {
        const author = document.createElement("div")
        author.style.cssText = "font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;"
        const aIcon = document.createElement("i")
        aIcon.className = "fa-solid fa-feather"
        aIcon.setAttribute("aria-hidden", "true")
        author.appendChild(aIcon)
        author.appendChild(document.createTextNode(` ${node.author}`))
        wrap.appendChild(author)
      }

      const link = document.createElement("a")
      link.href = `/books/${bookId}`
      link.className = "btn btn-secondary"
      link.style.cssText = "font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center;"
      link.appendChild(document.createTextNode("Ver Ficha del Libro "))
      const arrIcon = document.createElement("i")
      arrIcon.className = "fa-solid fa-arrow-right"
      arrIcon.setAttribute("aria-hidden", "true")
      link.appendChild(arrIcon)
      wrap.appendChild(link)
    }

    this.panelTarget.appendChild(wrap)
  }
}
