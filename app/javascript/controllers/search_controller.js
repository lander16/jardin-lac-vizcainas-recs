import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { url: String }

  connect() {
    this.timeout = null
  }

  input(event) {
    clearTimeout(this.timeout)
    const query = event.target.value.trim()

    this.timeout = setTimeout(() => {
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set("q", query)

      const frameId = this.element.closest(".glass-card").querySelector("turbo-frame")?.id || 
                      document.querySelector("turbo-frame").id

      const frame = document.getElementById(frameId)
      if (frame) {
        frame.src = url.toString()
      }
    }, 300)
  }
}
