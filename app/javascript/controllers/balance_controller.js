import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "contentSlider", "collabSlider", "authSlider",
    "contentVal", "collabVal", "authVal"
  ]
  static values = { url: String }

  connect() {
    this.timeout = null
  }

  update(event) {
    const changed = event.target
    let c = parseFloat(this.contentSliderTarget.value)
    let l = parseFloat(this.collabSliderTarget.value)
    let a = parseFloat(this.authSliderTarget.value)

    if (changed === this.contentSliderTarget) {
      const rem = 1.0 - c
      const sumOther = l + a
      if (sumOther > 0) {
        l = (l / sumOther) * rem
        a = (a / sumOther) * rem
      } else {
        l = rem / 2.0
        a = rem / 2.0
      }
    } else if (changed === this.collabSliderTarget) {
      const rem = 1.0 - l
      const sumOther = c + a
      if (sumOther > 0) {
        c = (c / sumOther) * rem
        a = (a / sumOther) * rem
      } else {
        c = rem / 2.0
        a = rem / 2.0
      }
    } else if (changed === this.authSliderTarget) {
      const rem = 1.0 - a
      const sumOther = c + l
      if (sumOther > 0) {
        c = (c / sumOther) * rem
        l = (l / sumOther) * rem
      } else {
        c = rem / 2.0
        l = rem / 2.0
      }
    }

    this.contentSliderTarget.value = c.toFixed(2)
    this.collabSliderTarget.value = l.toFixed(2)
    this.authSliderTarget.value = a.toFixed(2)

    this.contentValTarget.textContent = `${Math.round(c * 100)}%`
    this.collabValTarget.textContent = `${Math.round(l * 100)}%`
    this.authValTarget.textContent = `${Math.round(a * 100)}%`

    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set("w_content", c.toFixed(2))
      url.searchParams.set("w_collab", l.toFixed(2))
      url.searchParams.set("w_auth", a.toFixed(2))

      const frame = document.getElementById("recommendations-list")
      if (frame) {
        frame.src = url.toString()
      }
    }, 250)
  }
}
