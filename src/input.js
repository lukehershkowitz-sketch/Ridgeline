// Keyboard input.

const CAPTURED_KEYS = new Set([`Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Tab`]);

const Input = class {
  constructor() {
    (this.down = new Set()),
      (this.pressed = new Set()),
      window.addEventListener(`keydown`, (e) => {
        CAPTURED_KEYS.has(e.code) && e.preventDefault(),
          this.down.has(e.code) || this.pressed.add(e.code),
          this.down.add(e.code);
      }),
      window.addEventListener(`keyup`, (e) => this.down.delete(e.code)),
      window.addEventListener(`blur`, () => this.down.clear());
  }
  is(...e) {
    return e.some((e) => this.down.has(e));
  }
  hit(...e) {
    return e.some((e) => this.pressed.has(e));
  }
  snapshot() {
    let e = this.is(`KeyA`, `ArrowLeft`),
      t = this.is(`KeyD`, `ArrowRight`);
    return {
      throttle: this.is(`KeyW`, `ArrowUp`),
      brake: this.is(`KeyS`, `ArrowDown`),
      steer: !!e - +!!t,
      hop: this.hit(`Space`),
      hopHeld: this.is(`Space`),
      mod: this.is(`ShiftLeft`, `ShiftRight`),
      whip: this.is(`KeyQ`),
      superman: this.is(`KeyE`),
      nohander: this.is(`KeyF`),
      cancan: this.is(`KeyC`),
      butter: this.hit(`KeyB`),
      wheelie: this.is(`KeyV`),
    };
  }
  endFrame() {
    this.pressed.clear();
  }
};

export { Input };
