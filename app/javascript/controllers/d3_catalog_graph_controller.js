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
      if (!response.ok) throw new Error("Failed to load catalog graph data")
      const data = await response.json()
      this.renderGraph(data)
    } catch (err) {
      if (this.hasPanelTarget) {
        this.panelTarget.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--color-accent);">Error al cargar grafo de catálogo: ${err.message}</div>`
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

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform))

    svg.call(zoom)

    const colors = {
      1: "#7c1933", // Target book (burgundy)
      2: "#7d4f9b", // Authority (purple)
      3: "#56697a"  // Connected book (slate)
    }

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => (d.radius || 10) + 4))

    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "rgba(125,79,155,0.3)")
      .attr("stroke-width", 1.5)

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
    if (node.type === "authority") {
      const authId = node.id.replace("auth_", "")
      html = `
        <div style="padding:0.5rem;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--color-authority); font-weight:700; margin-bottom:0.25rem;">
            <i class="fa-solid fa-tag"></i> Autoridad Catalogada
          </div>
          <h3 style="font-family:var(--font-display); font-size:1.4rem; font-weight:700; margin:0 0 0.5rem 0;">${node.name}</h3>
          ${node.auth_type ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.5rem;"><strong>Tipo:</strong> ${node.auth_type}</div>` : ""}
          <a href="/catalog" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center; margin-top:0.75rem;">
            Explorar en el Catálogo <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      `
    } else {
      const bookId = node.id.replace("book_", "").replace("collab_book_", "")
      html = `
        <div style="padding:0.5rem;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--color-accent); font-weight:700; margin-bottom:0.25rem;">
            <i class="fa-solid fa-book"></i> Obra del Acervo
          </div>
          <h3 style="font-family:var(--font-display); font-size:1.3rem; font-weight:700; margin:0 0 0.5rem 0;">${node.name}</h3>
          ${node.author ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-solid fa-feather"></i> ${node.author}</div>` : ""}
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <a href="/books/${bookId}" class="btn btn-secondary" style="font-size:0.8rem; padding:0.4rem 0.8rem; justify-content:center;">
              Ver Ficha de la Obra <i class="fa-solid fa-arrow-right"></i>
            </a>
            <a href="/catalog/graph/${bookId}" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem; justify-content:center;">
              Ver Grafo de esta Obra <i class="fa-solid fa-diagram-project"></i>
            </a>
          </div>
        </div>
      `
    }

    this.panelTarget.innerHTML = html
  }
}
