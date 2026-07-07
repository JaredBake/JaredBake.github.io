import { createElement, createSafeLink, setText } from "./domHelpers.js";

function renderHero(data) {
  setText("hero-display-word", data.profile.heroDisplayWord || "TEXT");
  setText("hero-role", data.profile.role);
  setText("hero-title", `${data.profile.name}`);
  setText("hero-summary", data.profile.summary);
  setText("availability-pill", data.profile.availability || "Open to opportunities");
  setText("hero-photo-name", data.profile.name);
  setText("hero-photo-location", data.profile.location || "Location not set");

  const photo = document.getElementById("hero-photo");
  if (photo) {
    photo.setAttribute("src", data.profile.imageSrc || "");
    photo.setAttribute("alt", data.profile.imageAlt || `${data.profile.name} profile photo`);
    photo.setAttribute("loading", "eager");
    photo.setAttribute("decoding", "async");
  }

  const actions = document.getElementById("hero-actions");
  if (actions) {
    actions.innerHTML = "";
    const resumeLink = createSafeLink("View Resume", data.profile.resumeUrl, "btn btn-primary");
    resumeLink.target = "_blank";
    resumeLink.rel = "noopener noreferrer";

    actions.append(
      resumeLink,
      createSafeLink("GitHub", data.profile.githubUrl, "btn btn-secondary")
    );
  }

  const metrics = document.getElementById("quick-metrics");
  if (metrics) {
    metrics.innerHTML = "";
  }
  data.metrics.forEach((item) => {
    const li = createElement("li", "metric-item");
    li.append(createElement("strong", "metric-value", item.value), createElement("span", "metric-label", item.label));
    metrics?.append(li);
  });

  const focusList = document.getElementById("focus-list");
  if (focusList) {
    focusList.innerHTML = "";
  }
  data.focus.forEach((point) => {
    const li = createElement("li", "focus-item", point);
    focusList?.append(li);
  });

  const heroQuickContact = document.getElementById("hero-quick-contact");
  if (heroQuickContact) {
    heroQuickContact.innerHTML = "";
    const quickContacts = (data.contact?.cta || []).filter((entry) => {
      const label = (entry.label || "").toLowerCase();
      return label === "email" || label === "phone";
    });

    quickContacts.forEach((entry) => {
      const label = `${entry.label.replace(/:$/, "")}: `;
      const href = entry.href || "";
      const isClickable = /^(mailto:|https?:\/\/)/i.test(href);
      const displayText = href.startsWith("mailto:") ? href.replace("mailto:", "") : href;
      const item = createElement("p", "contact-info-item");

      if (isClickable) {
        item.append(label, createSafeLink(displayText, href, "text-link"));
      } else {
        item.append(label, displayText);
      }

      heroQuickContact.append(item);
    });
  }
}

function renderAbout(data) {
  const panel = document.getElementById("about-panel");
  if (panel) {
    panel.innerHTML = "";
    panel.append(createElement("h3", "", "My Approach"), createElement("p", "", data.about.intro), createElement("p", "", data.about.details));
  }

  const list = document.getElementById("expect-list");
  if (list) {
    list.innerHTML = "";
  }
  data.expectations.forEach((entry) => {
    list?.append(createElement("li", "", entry));
  });
}

function renderTimeline(listId, entries) {
  const list = document.getElementById(listId);
  if (list) {
    list.innerHTML = "";
  }
  entries.forEach((entry) => {
    const item = createElement("li", "timeline-item");

    const topRow = createElement("div", "timeline-top");
    topRow.append(createElement("h4", "", entry.title), createElement("span", "period", entry.period));

    item.append(topRow, createElement("p", "organization", entry.organization));

    const details = createElement("ul", "timeline-highlights");
    entry.highlights.forEach((point) => details.append(createElement("li", "", point)));

    item.append(details);
    list?.append(item);
  });
}

function renderProjects(data) {
  const grid = document.getElementById("projects-grid");
  if (grid) {
    grid.innerHTML = "";
  }

  data.projects.forEach((project) => {
    const card = createElement("article", "project-card");
    card.append(createElement("h3", "", project.name), createElement("p", "project-desc", project.description));

    const stack = createElement("ul", "stack-list");
    project.stack.forEach((tech) => stack.append(createElement("li", "", tech)));

    card.append(stack, createElement("p", "impact", project.impact));

    grid?.append(card);
  });
}

function renderSkills(data) {
  const toolbox = document.getElementById("toolbox-list");
  if (toolbox) {
    toolbox.innerHTML = "";
  }
  data.skills.toolbox.forEach((skill) => toolbox?.append(createElement("li", "chip", skill)));

  const strengths = document.getElementById("strengths-list");
  if (strengths) {
    strengths.innerHTML = "";
  }
  data.skills.strengths.forEach((skill) => strengths?.append(createElement("li", "chip", skill)));
}

function renderContact(data) {
  setText("contact-text", data.contact.text);

  const actions = document.getElementById("contact-actions");
  if (actions) {
    actions.innerHTML = "";
  }

  data.contact.cta.forEach((link) => {
    const label = `${link.label.replace(/:$/, "")}: `;
    const href = link.href || "";
    const isClickable = /^(mailto:|https?:\/\/)/i.test(href);
    const displayText = href.startsWith("mailto:") ? href.replace("mailto:", "") : href;
    const item = createElement("p", "contact-info-item");

    if (isClickable) {
      item.append(label, createSafeLink(displayText, href, "text-link"));
    } else {
      item.append(label, displayText);
    }

    actions?.append(item);
  });
}

function renderFooter(data) {
  const year = new Date().getFullYear();
  setText("footer-copy", `${year} ${data.profile.name} | Built for recruiters, teams, and collaborators.`);
}

export function renderPortfolio(data) {
  renderHero(data);
  renderAbout(data);
  renderTimeline("experience-list", data.experience);
  renderTimeline("education-list", data.education);
  renderProjects(data);
  renderSkills(data);
  renderContact(data);
  renderFooter(data);
}
