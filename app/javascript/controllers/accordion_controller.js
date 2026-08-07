import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon", "button"]

  toggle() {
    if (!this.hasPanelTarget) return

    const isHidden = this.panelTarget.style.display === "none" || !this.panelTarget.style.display
    this.panelTarget.style.display = isHidden ? "block" : "none"

    if (this.hasIconTarget) {
      this.iconTarget.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)"
    }

    // Keep aria-expanded in sync with the visible state so screen readers
    // announce the change and keyboard users get a hint.
    if (this.hasButtonTarget) {
      this.buttonTarget.setAttribute("aria-expanded", String(isHidden))
    } else if (this.element.tagName === "BUTTON") {
      this.element.setAttribute("aria-expanded", String(isHidden))
    }
  }
}
