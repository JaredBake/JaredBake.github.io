import { portfolioData } from "../data/portfolioData.js";
import { renderPortfolio } from "./renderSections.js";
import { initSidewaysGame } from "./sidewaysGame.js";

document.documentElement.classList.add("js");

function applyBranding(data) {
  document.title = `Portfolio | ${data.profile.name}`;

  const headerNameElement = document.getElementById("header-name");
  if (headerNameElement) {
    headerNameElement.textContent = data.profile.name;
  }
}

function setupRevealAnimations() {
  const elements = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    elements.forEach((el) => el.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((el) => observer.observe(el));
}

function setupSmoothNavigation() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupScrollProgress() {
  const progressBar = document.getElementById("scroll-progress-bar");
  if (!progressBar) return;

  const setProgress = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    progressBar.style.width = `${progress}%`;
  };

  setProgress();
  window.addEventListener("scroll", setProgress, { passive: true });
  window.addEventListener("resize", setProgress);
}

function setupActiveNavSignals() {
  const links = document.querySelectorAll(".main-nav a[href^='#']");
  if (!links.length) return;

  const sectionIds = ["about", "resume", "projects", "skills", "contact"];
  const sectionMap = new Map();

  links.forEach((link) => {
    const id = link.getAttribute("href")?.replace("#", "");
    if (!id) return;
    const section = document.getElementById(id);
    if (section) sectionMap.set(id, { section, link });
  });

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visible.length) return;
      setActive(visible[0].target.id);
    },
    { root: null, threshold: [0.25, 0.45, 0.7], rootMargin: "-20% 0px -55% 0px" }
  );

  sectionIds.forEach((id) => {
    const item = sectionMap.get(id);
    if (item) observer.observe(item.section);
  });
}

function init() {
  applyBranding(portfolioData);
  renderPortfolio(portfolioData);
  setupRevealAnimations();
  setupSmoothNavigation();
  setupScrollProgress();
  setupActiveNavSignals();
  initSidewaysGame();
}

init();
