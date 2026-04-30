/**
 * Lightweight, keyword-based helper text (no external API).
 * Suggests extra details farmers often forget to add to a job post.
 */
export const getSmartJobHints = (query: string): string[] => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [
      "Mention approximate field distance from the main road or village landmark.",
      "Note start time (e.g. 7 AM) and whether work continues on weekends.",
      "Clarify if tools (sickle, baskets) are provided or workers should bring their own.",
    ];
  }

  const hints: string[] = [];

  if (/(rice|paddy|धान)/i.test(query)) {
    hints.push("State water level / nursery age if transplanting, or grain moisture if harvesting.");
  }
  if (/(wheat|गेहूं)/i.test(query)) {
    hints.push("Mention if work is manual cutting, bundling, or only picking up windrows.");
  }
  if (/(cotton|कपास)/i.test(query)) {
    hints.push("Cotton picking: specify bags provided, target kg per day if you have one, and thorn protection.");
  }
  if (/(vegetable|सब्जी|tomato|onion|potato)/i.test(query)) {
    hints.push("For vegetables: clarify bed/row spacing, picking crates, and quality grade expected.");
  }
  if (/(water|irrigation|पानी|सिंचाई)/i.test(query)) {
    hints.push("Irrigation: mention canal vs borewell timing, channel depth, and night shift if applicable.");
  }
  if (/(spray|pesticide|दवा)/i.test(query)) {
    hints.push("Spraying: note PPE availability, re-entry interval, and who supplies chemicals.");
  }
  if (/(harvest|cutting|कटाई|फसल)/i.test(query)) {
    hints.push("Harvest: specify stacking place, transport to yard, and meal break length.");
  }
  if (/(weed|निराई)/i.test(query)) {
    hints.push("Weeding: clarify hand vs tool, expected area per day, and repeat visits if needed.");
  }
  if (/\d+\s*(worker|लोग|आदमी|मजदूर)/i.test(query)) {
    hints.push("You mentioned headcount — add if the wage is per person or shared team rate.");
  }

  if (hints.length === 0) {
    hints.push("Add field landmark, reporting time, and whether advance payment is offered.");
    hints.push("List safety notes: snakes, uneven ground, or electric fences near the plot.");
  }

  return [...new Set(hints)].slice(0, 6);
};
