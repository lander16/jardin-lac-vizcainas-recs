import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

export default class extends Controller {
  static targets = ["container", "panel"]
  static values = { url: String }

  connect() {
    if (!this.hasContainerTarget || !this.urlValue) return
    this.loadGraph()
  }

  async loadGraph() {
    try {
      const response = await fetch(this.urlValue)
      if (!response.ok) throw new Error("Failed to load graph data")
      const data = await response.json()
      this.renderGraph(data)
    } catch (err) {
      if (this.hasPanelTarget) {
        this.panelTarget.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--color-accent);">Error al cargar grafo: ${err.message}</div>`
      }
    }
  }

  renderGraph(data) {
    const container = this.containerTarget
    container.innerHTML = ""

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
      .attr("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")

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

    let html = ""
    if (node.type === "target_user" || node.type === "similar_user") {
      const isTarget = node.type === "target_user"
      html = `
        <div style="padding:0.5rem;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--color-accent); font-weight:700; margin-bottom:0.25rem;">
            <i class="fa-solid fa-user"></i> ${isTarget ? "Lector Principal" : "Lector Afín"}
          </div>
          <h3 style="font-family:var(--font-display); font-size:1.4rem; font-weight:700; margin:0 0 0.5rem 0;">${node.name}</h3>
          ${node.jaccard ? `<div style="font-size:0.85rem; color:var(--color-sage); font-weight:600; margin-bottom:1rem;"><i class="fa-solid fa-percent"></i> ${Math.round(node.jaccard * 100)}% de afinidad Jaccard</div>` : ""}
          <a href="/users/${node.id}" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center;">
            Ver Perfil de Recomendaciones <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      `
    } else {
      const bookId = node.id.replace("book_", "").replace("collab_book_", "")
      html = `
        <div style="padding:0.5rem;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--color-slate); font-weight:700; margin-bottom:0.25rem;">
            <i class="fa-solid fa-book"></i> Obra en Red
          </div>
          <h3 style="font-family:var(--font-display); font-size:1.3rem; font-weight:700; margin:0 0 0.5rem 0;">${node.name}</h3>
          ${node.author ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-solid fa-feather"></i> ${node.author}</div>` : ""}
          <a href="/books/${bookId}" class="btn btn-secondary" style="font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center;">
            Ver Ficha del Libro <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      `
    }

    this.panelTarget.innerHTML = html
  }
}
