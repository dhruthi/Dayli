import { test, expect } from "@playwright/test";

/**
 * E2E coverage for Task #36 — Telangana pilot impact section.
 *
 * Verifies:
 *  - Home pilot section renders the anchor stat, partner attribution,
 *    four metric tiles, and quote.
 *  - Clicking the "Read the case study" CTA navigates (SPA) to
 *    /about with hash #pilot-story and the pilot story is reachable.
 *  - Clinics hero credibility chip renders with the partner attribution.
 *  - The flow works in Hindi (LTR alt locale) and Arabic (RTL).
 *
 * All numbers are user-acknowledged placeholders; we assert presence
 * rather than exact values to keep these tests stable when real data
 * lands (see follow-up task #37).
 */

const PARTNER_RE_EN =
  /Women Development & Child Welfare Department, Government of Telangana/i;

test.describe("Telangana pilot impact — English (default locale)", () => {
  test("Home: pilot section renders headline content + tiles + quote", async ({
    page,
  }) => {
    await page.goto("/");

    const section = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await expect(section).toBeVisible();
    // Make the section actually intersect so IntersectionObserver-driven
    // reveal animations (opacity 0 -> 1) settle before assertions.
    await section.scrollIntoViewIfNeeded();
    // Eyebrow stored lowercase; CSS .uppercase visualizes it. Match the
    // underlying text node.
    await expect(section.getByText("Proof in the field")).toBeVisible();
    await expect(
      section.getByRole("heading", { name: /Validated at government scale/i }),
    ).toBeVisible();
    // The partner name appears twice in the section (intro paragraph + quote
     // attribution footer). Use .first() to satisfy strict mode.
    await expect(section.getByText(PARTNER_RE_EN).first()).toBeVisible();

    // Anchor stat (placeholder value 1,800+).
    await expect(section.getByText(/1,800\+/)).toBeVisible();

    // Four supporting metric tile labels.
    await expect(section.getByText(/WhatsApp conversations/i)).toBeVisible();
    await expect(
      section.getByText(/heat & climate alerts delivered/i),
    ).toBeVisible();
    await expect(
      section.getByText(/high-risk cases flagged for clinical follow-up/i),
    ).toBeVisible();
    await expect(section.getByText(/of conversations in Telugu/i)).toBeVisible();

    // Pull quote attribution.
    await expect(
      section.getByText(/Joint Director.*Women Development/i),
    ).toBeVisible();

    // CTA exists and points at the case-study anchor.
    const cta = section.getByRole("link", { name: /Read the case study/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/about#pilot-story$/);
  });

  test("Home -> About: CTA navigates (SPA) to #pilot-story and the section is in view", async ({
    page,
  }) => {
    await page.goto("/");

    // Stash a sentinel so we can detect a full reload vs. SPA nav.
    await page.evaluate(() => {
      (window as unknown as { __spaSentinel?: boolean }).__spaSentinel = true;
    });

    const homeSection = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await homeSection.scrollIntoViewIfNeeded();
    await homeSection
      .getByRole("link", { name: /Read the case study/i })
      .click();

    await page.waitForURL(/\/about#pilot-story$/);

    // SPA nav: window object should still hold the sentinel.
    const sentinelStillThere = await page.evaluate(
      () => (window as unknown as { __spaSentinel?: boolean }).__spaSentinel === true,
    );
    expect(sentinelStillThere).toBe(true);

    // The pilot story section is mounted in the DOM.
    const storySection = page.locator("#pilot-story");
    await expect(storySection).toBeAttached();

    // Critical: verify the hash-scroll behavior actually fired. About.tsx has a
    // useEffect that reads window.location.hash on mount and calls
    // scrollIntoView. We assert the section is within the viewport WITHOUT any
    // manual scroll on our part — otherwise we'd be testing scrollIntoViewIfNeeded
    // instead of the app's hash-scroll.
    await expect
      .poll(
        async () => {
          const box = await storySection.boundingBox();
          if (!box) return false;
          const viewportHeight = page.viewportSize()?.height ?? 720;
          // Section's top edge should be visible inside the viewport (allow
          // for sticky header offset via scroll-mt-24 in About.tsx; top can
          // legitimately sit just under a header band).
          return box.y >= 0 && box.y <= viewportHeight;
        },
        { timeout: 5000, message: "Expected #pilot-story to scroll into the viewport on hash navigation" },
      )
      .toBe(true);

    await expect(
      storySection.getByRole("heading", { name: /Pilot story: Telangana 2025/i }),
    ).toBeVisible();
    // Eyebrow stored as "Field proof"; CSS .uppercase visualizes it.
    await expect(storySection.getByText("Field proof")).toBeVisible();

    // At least one of the four block titles renders.
    await expect(
      storySection.getByText(/The opportunity|What we did|What we learned|What's next/i)
        .first(),
    ).toBeVisible();

    // The compact metrics strip echoes the four Home tiles
    // (no anchor-stat substitution).
    await expect(storySection.getByText("24,000+")).toBeVisible();
    await expect(storySection.getByText("4,200+")).toBeVisible();
    await expect(storySection.getByText("312")).toBeVisible();
    // "92%" also appears inside the prose body; match the metric tile exactly.
    await expect(storySection.getByText("92%", { exact: true })).toBeVisible();
  });

  test("Clinics: hero credibility chip renders below the intro", async ({
    page,
  }) => {
    await page.goto("/clinics");
    await expect(
      page.getByText(
        /Pilot partner: Women & Child Welfare Department, Govt\. of Telangana/i,
      ),
    ).toBeVisible();
  });
});

test.describe("Telangana pilot impact — Hindi (/hi)", () => {
  test("Home pilot section renders in Hindi without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/hi");
    const section = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    // Numerical anchor is locale-agnostic.
    await expect(section.getByText(/1,800\+/)).toBeVisible();
    // Hindi heading copy is present.
    await expect(
      section.getByRole("heading", { name: /सरकारी पैमाने पर सिद्ध/ }),
    ).toBeVisible();

    expect(errors, `Page errors in Hindi: ${errors.join("\n")}`).toHaveLength(0);
  });
});

test.describe("Telangana pilot impact — Arabic (/ar) — RTL", () => {
  test("Home pilot section renders in RTL without layout breakage", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/ar");

    // RTL is applied at the document level.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const section = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    // Anchor stat in Arabic uses leading + and Latin digits.
    await expect(section.getByText(/\+1,800/)).toBeVisible();
    // Arabic heading copy is present.
    await expect(
      section.getByRole("heading", { name: /مُثبت على نطاق حكومي/ }),
    ).toBeVisible();

    expect(errors, `Page errors in Arabic: ${errors.join("\n")}`).toHaveLength(0);
  });

  test("Clinics chip uses logical (start) alignment in RTL", async ({ page }) => {
    await page.goto("/ar/clinics");
    // Anchor on the actual Arabic chip copy so we know we're measuring the
    // right element (rather than any stray .text-start in the layout).
    const chip = page.getByText(
      /شريك التجربة:.*قسم المرأة ورعاية الطفل/,
    );
    await expect(chip).toBeVisible();
    // Computed text-align should resolve to "right" (or "start") under dir=rtl
    // when the chip uses logical text-start. The original text-left bug would
    // have resolved to "left" here.
    const align = await chip.evaluate(
      (el) => window.getComputedStyle(el).textAlign,
    );
    expect(["right", "start"]).toContain(align);
  });
});
