import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "frame", "status", "clear"]
  static values = {
    url: String,
    singular: { type: String, default: "resultado" },
    plural: { type: String, default: "resultados" }
  }

  connect() {
    this.timeout = null
    this.syncFrameState()

    if (this.hasFrameTarget) {
      this.frameTarget.addEventListener("turbo:frame-load", this.onFrameLoad)
      this.frameTarget.addEventListener("turbo:fetch-request-error", this.onFetchError)
      this.frameTarget.addEventListener("turbo:frame-missing", this.onFetchError)
    }
  }

  disconnect() {
    clearTimeout(this.timeout)
    if (this.hasFrameTarget) {
      this.frameTarget.removeEventListener("turbo:frame-load", this.onFrameLoad)
      this.frameTarget.removeEventListener("turbo:fetch-request-error", this.onFetchError)
      this.frameTarget.removeEventListener("turbo:frame-missing", this.onFetchError)
    }
  }

  input(event) {
    const query = event.target.value.trim()
    this.performSearch(query, { immediate: false })
  }

  submitNow(event) {
    event.preventDefault()
    const query = this.hasInputTarget ? this.inputTarget.value.trim() : ""
    this.performSearch(query, { immediate: true })
  }

  clear() {
    if (!this.hasInputTarget) return
    this.inputTarget.value = ""
    this.performSearch("", { immediate: true })
    this.inputTarget.focus()
  }

  performSearch(query, { immediate }) {
    clearTimeout(this.timeout)
    this.toggleClearButton(query.length > 0)

    const targetUrl = this.buildUrl(query)
    if (this.hasFrameTarget && this.frameTarget.src === targetUrl) {
      this.syncFrameState()
      return
    }

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = query.length > 0 ? "Buscando…" : "Mostrando resultados…"
    }

    if (this.hasFrameTarget) {
      this.frameTarget.setAttribute("aria-busy", "true")
    }

    const execute = () => {
      if (!this.hasFrameTarget) return
      if (this.frameTarget.src === targetUrl) {
        this.syncFrameState()
        return
      }
      this.frameTarget.src = targetUrl
    }

    if (immediate) {
      execute()
    } else {
      this.timeout = setTimeout(execute, 300)
    }
  }

  buildUrl(query) {
    const url = new URL(this.urlValue, window.location.origin)
    if (query.length > 0) {
      url.searchParams.set("q", query)
    } else {
      url.searchParams.delete("q")
    }
    return url.toString()
  }

  syncFrameState() {
    if (!this.hasFrameTarget || !this.hasStatusTarget) return

    const query = this.hasInputTarget ? this.inputTarget.value.trim() : ""
    const count = this.countResults()
    const unit = count === 1 ? this.singularValue : this.pluralValue
    this.statusTarget.textContent = query.length > 0
      ? `${count} ${unit} para "${query}"`
      : `Mostrando ${count} ${unit}`
    this.toggleClearButton(query.length > 0)
    this.frameTarget.removeAttribute("aria-busy")
  }

  onFrameLoad = () => {
    this.syncFrameState()
  }

  onFetchError = (event) => {
    if (event.type === "turbo:frame-missing") {
      event.preventDefault()
    }
    if (this.hasFrameTarget) {
      this.frameTarget.removeAttribute("aria-busy")
    }
    if (this.hasStatusTarget) {
      this.statusTarget.textContent = "No se pudo completar la búsqueda. Intenta de nuevo."
    }
  }

  countResults() {
    if (!this.hasFrameTarget) return 0
    return this.frameTarget.querySelectorAll("[data-search-result-item]").length
  }

  toggleClearButton(show) {
    if (!this.hasClearTarget) return
    this.clearTarget.hidden = !show
  }
}
