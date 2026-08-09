import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "frame", "status", "clear"]
  static values = { url: String }

  connect() {
    this.timeout = null
    this.syncFrameState()

    if (this.hasFrameTarget) {
      this.frameTarget.addEventListener("turbo:frame-load", this.onFrameLoad)
    }
  }

  disconnect() {
    if (this.hasFrameTarget) {
      this.frameTarget.removeEventListener("turbo:frame-load", this.onFrameLoad)
    }
  }

  input(event) {
    clearTimeout(this.timeout)
    const query = event.target.value.trim()

    this.toggleClearButton(query.length > 0)

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = query.length > 0 ? "Buscando…" : "Mostrando resultados"
    }

    if (this.hasFrameTarget) {
      this.frameTarget.setAttribute("aria-busy", "true")
    }

    this.timeout = setTimeout(() => {
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set("q", query)

      if (this.hasFrameTarget) {
        this.frameTarget.src = url.toString()
      }
    }, 300)
  }

  clear() {
    if (!this.hasInputTarget) return
    this.inputTarget.value = ""
    this.input({ target: this.inputTarget })
    this.inputTarget.focus()
  }

  syncFrameState() {
    if (!this.hasFrameTarget || !this.hasStatusTarget) return

    const query = this.hasInputTarget ? this.inputTarget.value.trim() : ""
    const count = this.countResults()
    this.statusTarget.textContent = query.length > 0 ? `${count} resultado${count === 1 ? "" : "s"} para “${query}”` : `Mostrando ${count} resultado${count === 1 ? "" : "s"}`
    this.toggleClearButton(query.length > 0)
    this.frameTarget.removeAttribute("aria-busy")
  }

  onFrameLoad = () => {
    this.syncFrameState()
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
