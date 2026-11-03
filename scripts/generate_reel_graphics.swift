import Cocoa
import CoreGraphics

func drawDayliReelOverlay(
    badgeText: String,
    badgeBorderColor: NSColor,
    headlineText: String,
    subText: String,
    footerBadge: String,
    footerSub: String,
    outputPath: String
) {
    let width = 1080
    let height = 1920

    // Force strict 1:1 pixel representation (1080x1920, non-Retina scaling)
    guard let bitmapRep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: width * 4,
        bitsPerPixel: 32
    ) else { return }

    bitmapRep.size = NSSize(width: width, height: height)

    NSGraphicsContext.saveGraphicsState()
    guard let ctx = NSGraphicsContext(bitmapImageRep: bitmapRep) else { return }
    NSGraphicsContext.current = ctx

    // ── TOP HEADER CARD (Dayli AI Brand Theme) ─────────────────────────
    // Screen height: 1920. Origin (0,0) is bottom-left.
    // Card width: 940 (x: 70, leaving 70px safe margin on both sides)
    // Card height: 215 (from y: 1655 to 1870, leaving 50px safe margin from top)
    let cardRect = CGRect(x: 70, y: 1655, width: 940, height: 215)
    let cardPath = NSBezierPath(roundedRect: cardRect, xRadius: 26, yRadius: 26)

    // Background fill: Dayli AI Deep Teal / Dark Cyan (#0A2422) with 96% opacity
    NSColor(calibratedRed: 0.04, green: 0.14, blue: 0.13, alpha: 0.96).setFill()
    cardPath.fill()

    // Border: Dayli Light Teal (#167A77)
    NSColor(calibratedRed: 0.09, green: 0.48, blue: 0.47, alpha: 0.85).setStroke()
    cardPath.lineWidth = 2.5
    cardPath.stroke()

    // 1. Category Pill Badge (Centered)
    let pillWidth: CGFloat = 390
    let pillHeight: CGFloat = 36
    let pillRect = CGRect(
        x: cardRect.origin.x + (cardRect.width - pillWidth) / 2,
        y: cardRect.origin.y + 158,
        width: pillWidth,
        height: pillHeight
    )
    let pillPath = NSBezierPath(roundedRect: pillRect, xRadius: 18, yRadius: 18)
    NSColor(calibratedRed: 0.05, green: 0.28, blue: 0.27, alpha: 0.7).setFill()
    pillPath.fill()
    badgeBorderColor.setStroke()
    pillPath.lineWidth = 1.8
    pillPath.stroke()

    let pillStyle = NSMutableParagraphStyle()
    pillStyle.alignment = .center
    let pillAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: 17),
        .foregroundColor: badgeBorderColor,
        .paragraphStyle: pillStyle
    ]
    let pillStr = NSAttributedString(string: badgeText, attributes: pillAttrs)
    pillStr.draw(in: CGRect(x: pillRect.origin.x, y: pillRect.origin.y + 7, width: pillRect.width, height: 22))

    // 2. Main Headline (Centered with full multi-line word wrapping)
    let headStyle = NSMutableParagraphStyle()
    headStyle.alignment = .center
    headStyle.lineBreakMode = .byWordWrapping
    let headAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 32, weight: .heavy),
        .foregroundColor: NSColor.white,
        .paragraphStyle: headStyle
    ]
    let headStr = NSAttributedString(string: headlineText, attributes: headAttrs)
    let headRect = CGRect(
        x: cardRect.origin.x + 25,
        y: cardRect.origin.y + 80,
        width: cardRect.width - 50,
        height: 68
    )
    headStr.draw(in: headRect)

    // 3. Subtitle / Context (Centered with full multi-line word wrapping)
    let subStyle = NSMutableParagraphStyle()
    subStyle.alignment = .center
    subStyle.lineBreakMode = .byWordWrapping
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 20, weight: .medium),
        .foregroundColor: NSColor(calibratedRed: 0.74, green: 0.88, blue: 0.86, alpha: 1.0), // Dayli Soft Mint / Sage
        .paragraphStyle: subStyle
    ]
    let subStr = NSAttributedString(string: subText, attributes: subAttrs)
    let subRect = CGRect(
        x: cardRect.origin.x + 30,
        y: cardRect.origin.y + 16,
        width: cardRect.width - 60,
        height: 56
    )
    subStr.draw(in: subRect)

    // ── BOTTOM FOOTER CARD (Dayli AI Branding) ─────────────────────────
    // Card width: 940 (x: 70)
    // Card height: 125 (y: 55 to 180)
    let botRect = CGRect(x: 70, y: 55, width: 940, height: 125)
    let botPath = NSBezierPath(roundedRect: botRect, xRadius: 24, yRadius: 24)

    NSColor(calibratedRed: 0.04, green: 0.14, blue: 0.13, alpha: 0.96).setFill()
    botPath.fill()
    NSColor(calibratedRed: 0.09, green: 0.48, blue: 0.47, alpha: 0.75).setStroke()
    botPath.lineWidth = 2.0
    botPath.stroke()

    // Branding Title & Verification dot
    let brandStyle = NSMutableParagraphStyle()
    brandStyle.alignment = .left
    let brandAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 25, weight: .bold),
        .foregroundColor: NSColor.white,
        .paragraphStyle: brandStyle
    ]
    let brandStr = NSAttributedString(string: footerBadge, attributes: brandAttrs)
    brandStr.draw(at: CGPoint(x: botRect.origin.x + 30, y: botRect.origin.y + 68))

    let dotStyle = NSMutableParagraphStyle()
    dotStyle.alignment = .right
    let dotAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 20, weight: .semibold),
        .foregroundColor: NSColor(calibratedRed: 0.1, green: 0.85, blue: 0.55, alpha: 1.0),
        .paragraphStyle: dotStyle
    ]
    let dotStr = NSAttributedString(string: "● Live WhatsApp AI", attributes: dotAttrs)
    dotStr.draw(in: CGRect(x: botRect.origin.x + botRect.width - 280, y: botRect.origin.y + 70, width: 250, height: 26))

    // Footer Subtitle with word wrapping
    let fsubStyle = NSMutableParagraphStyle()
    fsubStyle.alignment = .left
    fsubStyle.lineBreakMode = .byWordWrapping
    let fsubAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 19, weight: .regular),
        .foregroundColor: NSColor(calibratedRed: 0.65, green: 0.78, blue: 0.77, alpha: 1.0),
        .paragraphStyle: fsubStyle
    ]
    let fsubStr = NSAttributedString(string: footerSub, attributes: fsubAttrs)
    fsubStr.draw(in: CGRect(x: botRect.origin.x + 30, y: botRect.origin.y + 22, width: botRect.width - 60, height: 38))

    NSGraphicsContext.restoreGraphicsState()

    guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else { return }
    try? pngData.write(to: URL(fileURLWithPath: outputPath))
    print("✅ Created 1080x1920 Dayli AI overlay: \(outputPath)")
}

let outDir = FileManager.default.currentDirectoryPath + "/docs/video_documentation/reels_graphics"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

// Dayli Brand Colors
let dayliOrange = NSColor(calibratedRed: 0.97, green: 0.62, blue: 0.18, alpha: 1.0) // #F79F2F
let dayliCoral  = NSColor(calibratedRed: 0.88, green: 0.33, blue: 0.24, alpha: 1.0) // #E0533C
let dayliMint   = NSColor(calibratedRed: 0.1,  green: 0.82, blue: 0.55, alpha: 1.0) // #10B981
let dayliBlue   = NSColor(calibratedRed: 0.22, green: 0.74, blue: 0.97, alpha: 1.0) // #38BDF8

// Reel 1: Heat Alert
drawDayliReelOverlay(
    badgeText: "DAYLI AI • CLIMATE COPILOT",
    badgeBorderColor: dayliOrange,
    headlineText: "45°C Heatwave vs. Pregnant Mother",
    subText: "Real-time maternal heat vulnerability evaluation in Hyderabad",
    footerBadge: "Dayli AI • Climate Health Copilot",
    footerSub: "DPDP Act 2023 Compliant • Hyperlocal Weather Integration",
    outputPath: outDir + "/overlay_reel_1.png"
)

// Reel 2: Clinical Safety Red Flag
drawDayliReelOverlay(
    badgeText: "CLINICAL SAFETY CORE",
    badgeBorderColor: dayliCoral,
    headlineText: "Why This AI Refuses to Chat",
    subText: "Deterministic Red-Flag Escalation vs. LLM Hallucinations",
    footerBadge: "Dayli AI • Clinical Safety Core",
    footerSub: "Emergency 112 Escalation • Zero GenAI Hallucinations",
    outputPath: outDir + "/overlay_reel_2.png"
)

// Reel 3: Zero App Download
drawDayliReelOverlay(
    badgeText: "ZERO BARRIER ACCESS",
    badgeBorderColor: dayliMint,
    headlineText: "Healthcare Without an App",
    subText: "1-Click Web to WhatsApp • 3-Tap DPDP Consent & Setup",
    footerBadge: "Dayli AI • 500M+ Reach via WhatsApp",
    footerSub: "No App Install Required • Multilingual Vernacular Support",
    outputPath: outDir + "/overlay_reel_3.png"
)

// Reel 4: Emergency Hospital Locator
drawDayliReelOverlay(
    badgeText: "GEOSPATIAL ROUTING",
    badgeBorderColor: dayliBlue,
    headlineText: "Nearest Hospital in Seconds",
    subText: "Instant CEmONC Maternity Emergency Care & GPS Routing",
    footerBadge: "Dayli AI • Hospital & Care Locator",
    footerSub: "Verified Regional Registries • Distance & One-Tap Directions",
    outputPath: outDir + "/overlay_reel_4.png"
)

// Reel 5: Surveillance Heatmap
drawDayliReelOverlay(
    badgeText: "MUNICIPAL SURVEILLANCE",
    badgeBorderColor: dayliOrange,
    headlineText: "Metropolitan Heat Surveillance",
    subText: "Hyderabad Microclimate Telemetry vs. Maternal Cohorts",
    footerBadge: "Dayli AI • Public Health Dashboard",
    footerSub: "Predictive Heatwave Modeling • CEmONC Bed Readiness",
    outputPath: outDir + "/overlay_reel_5.png"
)
