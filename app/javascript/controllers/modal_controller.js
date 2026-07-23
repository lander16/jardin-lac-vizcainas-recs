import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dialog", "inspectorDialog"]

  open() {
    const dialog = this.hasDialogTarget ? this.dialogTarget : document.getElementById("checkout-modal")
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal()
    } else if (dialog) {
      dialog.setAttribute("open", "")
    }
  }

  close() {
    const dialog = this.hasDialogTarget ? this.dialogTarget : document.getElementById("checkout-modal")
    if (dialog && typeof dialog.close === "function") {
      dialog.close()
    } else if (dialog) {
      dialog.removeAttribute("open")
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
