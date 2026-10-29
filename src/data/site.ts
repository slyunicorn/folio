// Everything the portfolio page shows. Edit this file to make it yours.

export interface Link {
  label: string;
  href: string;
}

export interface Project {
  title: string;
  year: string;
  description: string;
  tags: string[];
  links: Link[];
}

export interface Role {
  title: string;
  org: string;
  period: string;
  summary: string;
}

export const site = {
  name: "Your Name",
  role: "Software Engineer",
  location: "City, Country",
  intro:
    "I build fast, careful software, from low-level C++ to the web. " +
    "This is a short introduction: what you work on and what you care about.",
  email: "you@example.com",
  links: [
    { label: "GitHub", href: "https://github.com/your-handle" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" },
  ] satisfies Link[],

  projects: [
    {
      title: "Perlin worms on the web",
      year: "2026",
      description:
        "A port of libnoise's worms.cpp demo from OpenGL/GLUT to TypeScript " +
        "and WebGL; it's the background of this page. Checked against the " +
        "native build to match it vertex for vertex.",
      tags: ["TypeScript", "WebGL", "Procedural noise"],
      links: [],
    },
    {
      title: "libnoise examples on modern Linux",
      year: "2026",
      description:
        "A Makefile build of the 2005 libnoise examples for GCC 16, including " +
        "a fix for signed-overflow undefined behaviour that broke Voronoi noise " +
        "at -O2.",
      tags: ["C++", "Make", "GCC"],
      links: [],
    },
    {
      title: "Project title",
      year: "2025",
      description:
        "One or two sentences on the problem, what you built, and the result. " +
        "Numbers help: users, speed-ups, size.",
      tags: ["Tag", "Tag"],
      links: [{ label: "Source", href: "https://github.com/your-handle/project" }],
    },
  ] satisfies Project[],

  about: [
    "A paragraph about you: how you got into this, what kind of problems you " +
      "like, and how you like to work.",
    "A second paragraph for anything else worth knowing: open source, " +
      "writing, teaching, or what you are learning next.",
  ],

  skills: ["C++", "TypeScript", "WebGL", "Astro", "Linux", "Make & CMake"],

  experience: [
    {
      title: "Role title",
      org: "Company",
      period: "2023 – now",
      summary: "What you own there and one result you are proud of.",
    },
    {
      title: "Role title",
      org: "Company",
      period: "2020 – 2023",
      summary: "What you did and what changed because of it.",
    },
  ] satisfies Role[],
};
