import Vision
import Foundation
import CoreGraphics
import ImageIO

func ocr(path: String) -> String {
    guard let url = URL(string: "file://" + path),
          let imgSource = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(imgSource, 0, nil) else { return "" }
    var text = ""
    let req = VNRecognizeTextRequest { (r, e) in
        let results = r.results as? [VNRecognizedTextObservation] ?? []
        text = results.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " | ")
    }
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([req])
    return text
}

let fm = FileManager.default
let dir = FileManager.default.currentDirectoryPath + "/docs/video_documentation/detailed_audit"
let files = (try? fm.contentsOfDirectory(atPath: dir).sorted()) ?? []

print("=== PART 1: WEBSITE ===")
for f in files where f.hasPrefix("web_") && f.hasSuffix(".jpg") {
    let t = ocr(path: dir + "/" + f).replacingOccurrences(of: "\n", with: " ")
    print("[\(f)]: \(t.prefix(140))")
}

print("\n=== PART 2: WHATSAPP ===")
for f in files where f.hasPrefix("wa_") && f.hasSuffix(".jpg") {
    let t = ocr(path: dir + "/" + f).replacingOccurrences(of: "\n", with: " ")
    print("[\(f)]: \(t.prefix(140))")
}

print("\n=== PART 3: DASHBOARD ===")
for f in files where f.hasPrefix("dash_") && f.hasSuffix(".jpg") {
    let t = ocr(path: dir + "/" + f).replacingOccurrences(of: "\n", with: " ")
    print("[\(f)]: \(t.prefix(140))")
}
