import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "button"]

  toggle() {
    if (!this.hasPanelTarget) return

    const willOpen = this.panelTarget.hasAttribute("hidden")
    this.panelTarget.hidden = !willOpen
    this.panelTarget.classList.toggle("active", willOpen)

    const button = this.hasButtonTarget
      ? this.buttonTarget
      : (this.element.tagName === "BUTTON" ? this.element : null)

    if (button) {
      button.setAttribute("aria-expanded", String(willOpen))
    }
  }
}
