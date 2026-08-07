import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dialog", "inspectorDialog"]

  open() {
    if (!this.hasDialogTarget) return
    if (typeof this.dialogTarget.showModal === "function") {
      this.dialogTarget.showModal()
    } else {
      this.dialogTarget.setAttribute("open", "")
    }
  }

  close() {
    if (!this.hasDialogTarget) return
    if (typeof this.dialogTarget.close === "function") {
      this.dialogTarget.close()
    } else {
      this.dialogTarget.removeAttribute("open")
    }
  }

  openAuthorityInspector(event) {
    const type = event.params.type || event.currentTarget.getAttribute("data-modal-type-param")
    const dialog = document.getElementById("authority-inspector-modal")
    const frame = document.getElementById("authority-inspector")

    if (frame && type) {
      frame.src = `/catalog/authorities/${encodeURIComponent(type)}`
    }

    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal()
    } else if (dialog) {
      dialog.setAttribute("open", "")
    }
  }

  closeInspector() {
    const dialog = document.getElementById("authority-inspector-modal")
    if (dialog && typeof dialog.close === "function") {
      dialog.close()
    } else if (dialog) {
      dialog.removeAttribute("open")
    }
  }
}
