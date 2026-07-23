import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "icon"]

  toggle() {
    if (this.hasPanelTarget) {
      const isHidden = this.panelTarget.style.display === "none" || !this.panelTarget.style.display
      this.panelTarget.style.display = isHidden ? "block" : "none"
      
      if (this.hasIconTarget) {
        this.iconTarget.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)"
      }
    }
  }
}
