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

  test("Hindi: CTA navigates to /hi/about#pilot-story and the section scrolls into view", async ({
    page,
  }) => {
    await page.goto("/hi");

    const homeSection = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await homeSection.scrollIntoViewIfNeeded();
    // CTA is the only link inside the pilot section pointing at the About hash.
    await homeSection
      .locator('a[href$="/about#pilot-story"]')
      .click();

    // Locale prefix is preserved on SPA navigation.
    await page.waitForURL(/\/hi\/about#pilot-story$/);

    const storySection = page.locator("#pilot-story");
    await expect(storySection).toBeAttached();
    // Hash-scroll fired without manual intervention.
    await expect
      .poll(
        async () => {
          const box = await storySection.boundingBox();
          if (!box) return false;
          const vh = page.viewportSize()?.height ?? 720;
          return box.y >= 0 && box.y <= vh;
        },
        { timeout: 5000 },
      )
      .toBe(true);
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

  test("Arabic: CTA navigates to /ar/about#pilot-story and the section scrolls into view (RTL)", async ({
    page,
  }) => {
    await page.goto("/ar");

    const homeSection = page.locator("section[aria-labelledby=\"pilot-impact\"]");
    await homeSection.scrollIntoViewIfNeeded();
    await homeSection
      .locator('a[href$="/about#pilot-story"]')
      .click();

    await page.waitForURL(/\/ar\/about#pilot-story$/);
    // RTL stays applied after SPA navigation.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const storySection = page.locator("#pilot-story");
    await expect(storySection).toBeAttached();
    await expect
      .poll(
        async () => {
          const box = await storySection.boundingBox();
          if (!box) return false;
          const vh = page.viewportSize()?.height ?? 720;
          return box.y >= 0 && box.y <= vh;
        },
        { timeout: 5000 },
      )
      .toBe(true);
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

/**
 * E2E coverage for Task #39 — editorial photography wired across Home,
 * About (#pilot-story), and Clinics. Asserts that every wired photo:
 *  - is mounted in the DOM as an <img>,
 *  - has a non-empty alt attribute (i.e. translations.imagery.* resolved),
 *  - is reachable in at least one non-default locale (Telugu) so we know
 *    the imagery key block exists across the four-locale contract.
 *
 * We deliberately do NOT assert exact alt copy here — the alt strings live
 * in translations.ts and may be tightened later. Empty-alt would mean a
 * missing locale key (regression we want to catch).
 */

const HOME_PHOTO_FILES = [
  "hero-mother-whatsapp",
  "problem-heat-mother-toddler",
  "solution-hands-phone",
  "pilot-telugu-grandmother",
] as const;

const ABOUT_PHOTO_FILES = [
  "pilot-asha-worker",
  "pilot-government-partnership",
] as const;

async function expectPhotoWithAlt(page: import("@playwright/test").Page, filenameStem: string) {
  // Vite hashes asset URLs (e.g. /assets/hero-mother-whatsapp-abc123.png) so
  // match by filename stem prefix, which is stable across builds.
  const img = page.locator(`img[src*="${filenameStem}"]`).first();
  await expect(img, `expected <img> for ${filenameStem} to be attached`).toBeAttached();
  const alt = await img.getAttribute("alt");
  expect(alt, `expected non-empty alt for ${filenameStem}`).toBeTruthy();
  expect((alt ?? "").trim().length).toBeGreaterThan(0);
}

test.describe("Editorial photography — alt text + locale coverage", () => {
  test("Home: hero + problem + solution + pilot photos all have non-empty alt", async ({
    page,
  }) => {
    await page.goto("/");
    for (const stem of HOME_PHOTO_FILES) {
      await expectPhotoWithAlt(page, stem);
    }
    // Hero photo specifically should be the one flagged for fast LCP fetching.
    const hero = page.locator(`img[src*="hero-mother-whatsapp"]`).first();
    await expect(hero).toHaveAttribute("fetchpriority", "high");
  });

  test("About #pilot-story: ASHA worker + government-partnership photos have non-empty alt", async ({
    page,
  }) => {
    await page.goto("/about#pilot-story");
    const story = page.locator("#pilot-story");
    await expect(story).toBeAttached();
    for (const stem of ABOUT_PHOTO_FILES) {
      const img = story.locator(`img[src*="${stem}"]`).first();
      await expect(img, `expected <img> for ${stem} inside #pilot-story`).toBeAttached();
      const alt = await img.getAttribute("alt");
      expect((alt ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  test("Clinics: clinician photo has non-empty alt", async ({ page }) => {
    await page.goto("/clinics");
    await expectPhotoWithAlt(page, "clinic-doctor");
  });

  test("Telugu locale: home hero + about pilot photos resolve a non-English alt", async ({
    page,
  }) => {
    await page.goto("/te");
    const heroAlt = await page
      .locator(`img[src*="hero-mother-whatsapp"]`)
      .first()
      .getAttribute("alt");
    expect((heroAlt ?? "").trim().length).toBeGreaterThan(0);
    // The Telugu alt should not be the English copy — sanity check that the
    // imagery key block actually renders the localized string.
    expect(heroAlt).not.toMatch(/young pregnant woman/i);

    await page.goto("/te/about#pilot-story");
    const ashaAlt = await page
      .locator(`img[src*="pilot-asha-worker"]`)
      .first()
      .getAttribute("alt");
    expect((ashaAlt ?? "").trim().length).toBeGreaterThan(0);
    expect(ashaAlt).not.toMatch(/ASHA health worker in a pink saree/i);
  });
});
