import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  confirm(event) {
    if (!window.confirm("¿Está seguro de que desea restablecer todos los préstamos agregados de vuelta a los datos base del CSV? Se perderán las simulaciones registradas.")) {
      event.preventDefault()
    }
  }
}
