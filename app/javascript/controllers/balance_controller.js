import { Controller } from "@hotwired/stimulus"

const DEFAULT_PERCENTAGES = [33, 33, 34]

function allocateLargestRemainder(rawWeights, targetSum = 100) {
  const total = rawWeights.reduce((acc, value) => acc + Math.max(0, value), 0)
  const exact = total > 0
    ? rawWeights.map((value) => (Math.max(0, value) / total) * targetSum)
    : rawWeights.map(() => targetSum / rawWeights.length)

  const floors = exact.map((value) => Math.floor(value))
  const remaining = targetSum - floors.reduce((acc, value) => acc + value, 0)

  const order = exact
    .map((value, index) => ({ index, frac: value - floors[index] }))
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remaining; i++) {
    floors[order[i].index] += 1
  }
  return floors
}

export function rebalancePercentages(rawWeights, changedIndex = -1) {
  if (changedIndex < 0 || changedIndex >= rawWeights.length) {
    return allocateLargestRemainder(rawWeights, 100)
  }

  const fixedPct = Math.max(0, Math.min(100, Math.round(rawWeights[changedIndex] * 100)))
  const remaining = 100 - fixedPct
  const otherIndices = rawWeights.map((_, index) => index).filter((index) => index !== changedIndex)
  const otherAllocated = allocateLargestRemainder(
    otherIndices.map((index) => rawWeights[index]),
    remaining
  )

  const result = new Array(rawWeights.length)
  result[changedIndex] = fixedPct
  otherIndices.forEach((index, pos) => {
    result[index] = otherAllocated[pos]
  })
  return result
}

export default class extends Controller {
  static targets = [
    "contentSlider", "collabSlider", "authSlider",
    "contentVal", "collabVal", "authVal", "status"
  ]
  static values = { url: String }

  connect() {
    this.timeout = null

    const frame = this.recommendationsFrame
    if (frame) {
      frame.addEventListener("turbo:frame-load", this.onFrameLoad)
      frame.addEventListener("turbo:fetch-request-error", this.onFrameError)
      frame.addEventListener("turbo:frame-missing", this.onFrameError)
    }

    const initial = rebalancePercentages(this.rawSliderValues)
    this.syncUi(initial)
  }

  disconnect() {
    clearTimeout(this.timeout)
    const frame = this.recommendationsFrame
    if (frame) {
      frame.removeEventListener("turbo:frame-load", this.onFrameLoad)
      frame.removeEventListener("turbo:fetch-request-error", this.onFrameError)
      frame.removeEventListener("turbo:frame-missing", this.onFrameError)
    }
  }

  update(event) {
    const changedIndex = this.sliders.indexOf(event.target)
    const percentages = rebalancePercentages(this.rawSliderValues, changedIndex)
    this.applyWeights(percentages, { immediate: false })
  }

  reset() {
    this.applyWeights(DEFAULT_PERCENTAGES, { immediate: true })
  }

  get sliders() {
    return [this.contentSliderTarget, this.collabSliderTarget, this.authSliderTarget]
  }

  get displays() {
    return [this.contentValTarget, this.collabValTarget, this.authValTarget]
  }

  get rawSliderValues() {
    return this.sliders.map((slider) => {
      const parsed = parseFloat(slider.value)
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    })
  }

  get recommendationsFrame() {
    return document.getElementById("recommendations-list")
  }

  syncUi(percentages) {
    percentages.forEach((pct, index) => {
      this.sliders[index].value = (pct / 100).toFixed(2)
      this.sliders[index].setAttribute("aria-valuetext", `${pct}%`)
      this.displays[index].textContent = `${pct}%`
    })
  }

  applyWeights(percentages, { immediate }) {
    this.syncUi(percentages)

    clearTimeout(this.timeout)
    const dispatch = () => {
      const [pctC, pctL, pctA] = percentages
      const weights = {
        w_content: (pctC / 100).toFixed(2),
        w_collab: (pctL / 100).toFixed(2),
        w_auth: (pctA / 100).toFixed(2)
      }

      const pageUrl = new URL(window.location.href)
      Object.entries(weights).forEach(([key, val]) => pageUrl.searchParams.set(key, val))
      window.history.replaceState(null, "", pageUrl.toString())

      const frame = this.recommendationsFrame
      if (!frame) return

      const frameUrl = new URL(this.urlValue, window.location.origin)
      Object.entries(weights).forEach(([key, val]) => frameUrl.searchParams.set(key, val))

      if (this.hasStatusTarget) {
        this.statusTarget.textContent = ""
        this.statusTarget.hidden = true
      }

      if (frame.src === frameUrl.toString()) {
        frame.removeAttribute("aria-busy")
        return
      }

      frame.setAttribute("aria-busy", "true")
      frame.src = frameUrl.toString()
    }

    if (immediate) {
      dispatch()
    } else {
      this.timeout = setTimeout(dispatch, 250)
    }
  }

  onFrameLoad = () => {
    const frame = this.recommendationsFrame
    if (frame) frame.removeAttribute("aria-busy")
  }

  onFrameError = (event) => {
    if (event.type === "turbo:frame-missing") {
      event.preventDefault()
    }
    const frame = this.recommendationsFrame
    if (frame) frame.removeAttribute("aria-busy")

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = "No se pudieron actualizar las recomendaciones. Intenta de nuevo."
      this.statusTarget.hidden = false
    }
  }
}
