import * as d3 from "d3"

export function truncateLabel(text, maxLength = 28) {
  const value = String(text || "")
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function extractBookId(node) {
  return node.book_id || String(node.id).replace(/^(?:collab_)?book_/, "")
}

export function extractPatronId(node) {
  return node.patron_id || String(node.id)
}

export function renderGraphLoading(loadingTarget) {
  if (!loadingTarget) return
  loadingTarget.hidden = false

  const icon = document.createElement("i")
  icon.className = "fa-solid fa-spinner fa-spin"
  icon.setAttribute("aria-hidden", "true")

  const label = document.createElement("span")
  label.textContent = "Cargando grafo…"

  loadingTarget.replaceChildren(icon, label)
}

export function renderEmptyGraph({ container, loadingTarget, message }) {
  if (loadingTarget) loadingTarget.hidden = true
  if (!container) return

  const wrap = document.createElement("div")
  wrap.className = "graph-empty-state"

  const icon = document.createElement("i")
  icon.className = "fa-solid fa-diagram-project"
  icon.setAttribute("aria-hidden", "true")

  const text = document.createElement("p")
  text.textContent = message

  wrap.append(icon, text)
  container.replaceChildren(wrap)
}

export function renderGraphError({ container, loadingTarget, panelTarget, title, onRetry }) {
  if (loadingTarget) loadingTarget.hidden = true

  if (container) {
    const wrap = document.createElement("div")
    wrap.className = "graph-empty-state graph-error-state"

    const icon = document.createElement("i")
    icon.className = "fa-solid fa-triangle-exclamation"
    icon.setAttribute("aria-hidden", "true")

    const text = document.createElement("p")
    text.textContent = title

    const retryBtn = document.createElement("button")
    retryBtn.type = "button"
    retryBtn.className = "btn btn-primary btn-compact"
    retryBtn.textContent = "Reintentar"
    retryBtn.addEventListener("click", onRetry)

    wrap.append(icon, text, retryBtn)
    container.replaceChildren(wrap)
  }

  if (panelTarget) {
    const errEl = document.createElement("div")
    errEl.className = "graph-panel-error"
    errEl.textContent = title
    panelTarget.replaceChildren(errEl)
  }
}

export function mountForceGraph({
  container,
  loadingTarget,
  data,
  svgAriaLabel,
  nodeColors,
  nodeAriaLabel,
  buildSimulation,
  linkStroke,
  linkDasharray,
  linkWidth,
  onSelectNode
}) {
  container.replaceChildren()
  if (loadingTarget) loadingTarget.hidden = true

  const width = container.clientWidth || 800
  const height = container.clientHeight || 550
  const reduceMotion = prefersReducedMotion()
  let selectedNodeId = null

  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", svgAriaLabel)

  const g = svg.append("g")

  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => g.attr("transform", event.transform))

  svg.call(zoom)

  const simulation = buildSimulation(d3, data, width, height)

  const link = g.append("g")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke", linkStroke)
    .attr("stroke-dasharray", linkDasharray)
    .attr("stroke-width", linkWidth)

  const node = g.append("g")
    .selectAll("g")
    .data(data.nodes)
    .join("g")
    .attr("class", "graph-node")
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-label", nodeAriaLabel)
    .style("cursor", "pointer")

  node.append("title").text((d) => d.name)

  const circles = node.append("circle")
    .attr("r", (d) => d.radius || 10)
    .attr("fill", (d) => nodeColors[d.group] || "#7c1933")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)

  node.append("text")
    .text((d) => truncateLabel(d.name, 28))
    .attr("x", 14)
    .attr("y", 4)
    .attr("font-size", "10px")
    .attr("font-weight", (d) => d.group === 1 ? "700" : "500")
    .attr("fill", "var(--text-primary)")
    .style("pointer-events", "none")

  function updatePositions() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)

    node.attr("transform", (d) => `translate(${d.x},${d.y})`)
  }

  function selectNode(d) {
    selectedNodeId = d.id
    node.classed("is-selected", (item) => item.id === selectedNodeId)
    circles
      .attr("stroke", (item) => item.id === selectedNodeId ? "#2d241e" : "#ffffff")
      .attr("stroke-width", (item) => item.id === selectedNodeId ? 3.5 : 2)
    onSelectNode(d)
  }

  node.call(
    d3.drag()
      .on("start", (event, d) => {
        if (!reduceMotion && !event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
        if (reduceMotion) {
          d.x = event.x
          d.y = event.y
          updatePositions()
        }
      })
      .on("end", (event, d) => {
        if (!reduceMotion && !event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
  )

  node.on("click", (event, d) => {
    if (event.defaultPrevented) return
    selectNode(d)
  })

  node.on("keydown", (event, d) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      selectNode(d)
    }
  })

  if (reduceMotion) {
    simulation.stop()
    const totalTicks = Math.min(
      300,
      Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()))
    )
    for (let i = 0; i < totalTicks; i++) {
      simulation.tick()
    }
    updatePositions()
  } else {
    simulation.on("tick", updatePositions)
  }

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const nextWidth = Math.round(entry.contentRect.width)
    const nextHeight = Math.round(entry.contentRect.height)
    if (nextWidth <= 0 || nextHeight <= 0) return

    svg.attr("viewBox", [0, 0, nextWidth, nextHeight])
    simulation.force("center", d3.forceCenter(nextWidth / 2, nextHeight / 2))
    if (reduceMotion) {
      for (let i = 0; i < 30; i++) simulation.tick()
      updatePositions()
    } else {
      simulation.alpha(0.15).restart()
    }
  })
  resizeObserver.observe(container)

  return { svg, zoom, simulation, resizeObserver }
}

export function zoomGraphBy(graphInstance, factor) {
  if (!graphInstance) return
  const { svg, zoom } = graphInstance
  const duration = prefersReducedMotion() ? 0 : 220
  svg.transition().duration(duration).call(zoom.scaleBy, factor)
}

export function resetGraphZoom(graphInstance) {
  if (!graphInstance) return
  const { svg, zoom } = graphInstance
  const duration = prefersReducedMotion() ? 0 : 220
  svg.transition().duration(duration).call(zoom.transform, d3.zoomIdentity)
}

export function buildPanelContainer(kickerClass, iconClass, kickerText, titleText) {
  const wrap = document.createElement("div")
  wrap.className = "graph-panel-body"

  const label = document.createElement("div")
  label.className = `graph-panel-kicker ${kickerClass}`

  const icon = document.createElement("i")
  icon.className = iconClass
  icon.setAttribute("aria-hidden", "true")
  label.append(icon, document.createTextNode(` ${kickerText}`))

  const heading = document.createElement("h2")
  heading.className = "graph-panel-title"
  heading.textContent = titleText

  wrap.append(label, heading)
  return wrap
}

export function buildPanelLink({ href, className, text, iconClass }) {
  const link = document.createElement("a")
  link.href = href
  link.className = className
  link.appendChild(document.createTextNode(`${text} `))

  const icon = document.createElement("i")
  icon.className = iconClass
  icon.setAttribute("aria-hidden", "true")
  link.appendChild(icon)
  return link
}
