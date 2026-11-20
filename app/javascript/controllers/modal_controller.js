import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["inspectorDialog"]

  connect() {
    this.activeType = null
    this.abortController = null
    this.handleBeforeCache = () => this.closeInspector()
    document.addEventListener("turbo:before-cache", this.handleBeforeCache)
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this.handleBeforeCache)
    this.abortFetch()
    this.closeInspector()
  }

  openAuthorityInspector(event) {
    const type = event.params.type || event.currentTarget.getAttribute("data-modal-type-param")
    if (!type) return

    const dialog = this.dialogElement
    if (dialog) {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    }

    this.loadAuthorityType(type)
  }

  backdropClose(event) {
    const dialog = this.dialogElement
    if (dialog && event.target === dialog) {
      this.closeInspector()
    }
  }

  closeInspector() {
    this.abortFetch()
    const dialog = this.dialogElement
    if (!dialog) return

    if (typeof dialog.close === "function") {
      if (dialog.open) dialog.close()
    } else {
      dialog.removeAttribute("open")
    }
  }

  selectAuthority(event) {
    const list = event.currentTarget.closest("#inspector-tags-list") || this.element
    list.querySelectorAll(".tag-list-item").forEach((item) => {
      item.classList.remove("active")
      item.removeAttribute("aria-current")
    })
    event.currentTarget.classList.add("active")
    event.currentTarget.setAttribute("aria-current", "true")
  }

  retryLoad() {
    if (this.activeType) {
      this.loadAuthorityType(this.activeType)
    }
  }

  get dialogElement() {
    return this.hasInspectorDialogTarget
      ? this.inspectorDialogTarget
      : document.getElementById("authority-inspector-modal")
  }

  abortFetch() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async loadAuthorityType(type) {
    const frame = document.getElementById("authority-inspector")
    if (!frame) return

    this.activeType = type
    this.abortFetch()
    this.abortController = new AbortController()
    this.renderLoading(frame)

    try {
      const response = await fetch(`/catalog/authorities?type=${encodeURIComponent(type)}`, {
        signal: this.abortController.signal,
        headers: {
          "Turbo-Frame": "authority-inspector",
          Accept: "text/html, application/xhtml+xml"
        }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, "text/html")
      const incomingFrame = doc.querySelector("turbo-frame#authority-inspector")
      const nodes = incomingFrame ? incomingFrame.childNodes : doc.body.childNodes
      frame.replaceChildren(...Array.from(nodes).map((node) => document.importNode(node, true)))
    } catch (err) {
      if (err.name === "AbortError") return
      this.renderError(frame, type)
    } finally {
      this.abortController = null
    }
  }

  renderLoading(frame) {
    const wrap = document.createElement("div")
    wrap.className = "inspector-modal-loading"

    const icon = document.createElement("i")
    icon.className = "fa-solid fa-spinner fa-spin fa-2x"
    icon.setAttribute("aria-hidden", "true")

    const label = document.createElement("span")
    label.textContent = "Cargando autoridades…"

    wrap.append(icon, label)
    frame.replaceChildren(wrap)
  }

  renderError(frame, type) {
    const wrap = document.createElement("div")
    wrap.className = "inspector-modal-error"

    const icon = document.createElement("i")
    icon.className = "fa-solid fa-triangle-exclamation fa-2x"
    icon.setAttribute("aria-hidden", "true")

    const msg = document.createElement("p")
    msg.textContent = `No se pudieron cargar las autoridades de tipo "${type}".`

    const actions = document.createElement("div")
    actions.className = "inspector-modal-error-actions"

    const retryBtn = document.createElement("button")
    retryBtn.type = "button"
    retryBtn.className = "btn btn-primary btn-compact"
    retryBtn.textContent = "Reintentar"
    retryBtn.dataset.action = "click->modal#retryLoad"

    const closeBtn = document.createElement("button")
    closeBtn.type = "button"
    closeBtn.className = "btn btn-secondary btn-compact"
    closeBtn.textContent = "Cerrar"
    closeBtn.dataset.action = "click->modal#closeInspector"

    actions.append(retryBtn, closeBtn)
    wrap.append(icon, msg, actions)
    frame.replaceChildren(wrap)
  }
}
