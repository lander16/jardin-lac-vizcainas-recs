import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

export default class extends Controller {
  static targets = ["container", "panel"]
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
      const response = await fetch(this.urlValue)
      if (!response.ok) throw new Error("Failed to load catalog graph data")
      const data = await response.json()
      this.renderGraph(data)
    } catch (err) {
      if (this.hasPanelTarget) {
        this.panelTarget.replaceChildren()
        const errEl = document.createElement("div")
        errEl.style.cssText = "padding:2rem; text-align:center; color:var(--color-accent);"
        errEl.textContent = `Error al cargar grafo de catálogo: ${err.message}`
        this.panelTarget.appendChild(errEl)
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
      .alphaDecay(0.05)
      .velocityDecay(0.4)
    this.simulation = simulation

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
    this.panelTarget.replaceChildren()

    const wrap = document.createElement("div")
    wrap.style.padding = "0.5rem"

    const label = document.createElement("div")
    label.style.cssText = "font-size:0.75rem; text-transform:uppercase; font-weight:700; margin-bottom:0.25rem;"

    const h3 = document.createElement("h3")
    h3.style.cssText = "font-family:var(--font-display); font-weight:700; margin:0 0 0.5rem 0;"

    if (node.type === "authority") {
      label.style.color = "var(--color-authority)"
      h3.style.fontSize = "1.4rem"

      const labelIcon = document.createElement("i")
      labelIcon.className = "fa-solid fa-tag"
      labelIcon.setAttribute("aria-hidden", "true")
      label.appendChild(labelIcon)
      label.appendChild(document.createTextNode(" Autoridad Catalogada"))

      h3.textContent = node.name

      wrap.appendChild(label)
      wrap.appendChild(h3)

      if (node.auth_type) {
        const typeEl = document.createElement("div")
        typeEl.style.cssText = "font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.5rem;"
        const strong = document.createElement("strong")
        strong.textContent = "Tipo:"
        typeEl.appendChild(strong)
        typeEl.appendChild(document.createTextNode(` ${node.auth_type}`))
        wrap.appendChild(typeEl)
      }

      const link = document.createElement("a")
      link.href = "/catalog"
      link.className = "btn btn-primary"
      link.style.cssText = "font-size:0.8rem; padding:0.4rem 0.8rem; width:100%; justify-content:center; margin-top:0.75rem;"
      link.appendChild(document.createTextNode("Explorar en el Catálogo "))
      const arrIcon = document.createElement("i")
      arrIcon.className = "fa-solid fa-arrow-right"
      arrIcon.setAttribute("aria-hidden", "true")
      link.appendChild(arrIcon)
      wrap.appendChild(link)
    } else {
      const bookId = node.id.replace("book_", "").replace("collab_book_", "")
      label.style.color = "var(--color-accent)"
      h3.style.fontSize = "1.3rem"

      const labelIcon = document.createElement("i")
      labelIcon.className = "fa-solid fa-book"
      labelIcon.setAttribute("aria-hidden", "true")
      label.appendChild(labelIcon)
      label.appendChild(document.createTextNode(" Obra del Acervo"))

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

      const actions = document.createElement("div")
      actions.style.cssText = "display:flex; flex-direction:column; gap:0.5rem;"

      const ficha = document.createElement("a")
      ficha.href = `/books/${bookId}`
      ficha.className = "btn btn-secondary"
      ficha.style.cssText = "font-size:0.8rem; padding:0.4rem 0.8rem; justify-content:center;"
      ficha.appendChild(document.createTextNode("Ver Ficha de la Obra "))
      const fIcon = document.createElement("i")
      fIcon.className = "fa-solid fa-arrow-right"
      fIcon.setAttribute("aria-hidden", "true")
      ficha.appendChild(fIcon)
      actions.appendChild(ficha)

      const grafo = document.createElement("a")
      grafo.href = `/catalog/graph/${bookId}`
      grafo.className = "btn btn-primary"
      grafo.style.cssText = "font-size:0.8rem; padding:0.4rem 0.8rem; justify-content:center;"
      grafo.appendChild(document.createTextNode("Ver Grafo de esta Obra "))
      const gIcon = document.createElement("i")
      gIcon.className = "fa-solid fa-diagram-project"
      gIcon.setAttribute("aria-hidden", "true")
      grafo.appendChild(gIcon)
      actions.appendChild(grafo)

      wrap.appendChild(actions)
    }

    this.panelTarget.appendChild(wrap)
  }
}
