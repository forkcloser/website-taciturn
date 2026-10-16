// Forkcloser — theme switch.
//
// Three states, cycled by one button: system (the default, follows the OS),
// light, dark. The choice is kept in this browser only; "system" clears it.
// The head of each page carries a three-line inline copy of the "apply
// stored choice" step so the first paint is already in the right theme;
// this file only wires the button.
(function () {
  var root = document.documentElement;
  var button = document.querySelector(".theme");
  if (!button) return;

  var order = ["system", "light", "dark"];

  function current() {
    var forced = root.getAttribute("data-theme");
    return forced === "light" || forced === "dark" ? forced : "system";
  }

  function apply(state) {
    if (state === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", state);
    }
    try {
      if (state === "system") localStorage.removeItem("forkcloser-theme");
      else localStorage.setItem("forkcloser-theme", state);
    } catch (e) {}
    label();
  }

  function label() {
    var now = current();
    var next = order[(order.indexOf(now) + 1) % order.length];
    var text = "Theme: " + now + ". Switch to " + next + ".";
    button.setAttribute("aria-label", text);
    button.setAttribute("title", text);
  }

  button.addEventListener("click", function () {
    apply(order[(order.indexOf(current()) + 1) % order.length]);
  });

  label();
})();
