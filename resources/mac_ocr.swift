import Foundation
import Vision
import Cocoa

guard CommandLine.arguments.count > 1 else {
    fputs("Usage: mac_ocr <image_path_or_stdin> [lang_code]\n", stderr)
    exit(1)
}

let imageArg = CommandLine.arguments[1]
let langArg = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : nil

var imageData: Data?
if imageArg == "-" {
    imageData = FileHandle.standardInput.readDataToEndOfFile()
} else {
    imageData = try? Data(contentsOf: URL(fileURLWithPath: imageArg))
}

guard let data = imageData, let nsImage = NSImage(data: data),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Error: Failed to load image data\n", stderr)
    exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

var recognitionLangs = ["zh-Hans", "zh-Hant", "en-US", "ja-JP"]
if let lang = langArg {
    let lower = lang.lowercased()
    if lower == "chs" || lower == "zh" || lower == "zh-hans" || lower == "auto" {
        recognitionLangs = ["zh-Hans", "zh-Hant", "en-US", "ja-JP"]
    } else if lower == "cht" || lower == "zh-hant" {
        recognitionLangs = ["zh-Hant", "zh-Hans", "en-US"]
    } else if lower == "eng" || lower == "en" {
        recognitionLangs = ["en-US", "zh-Hans"]
    } else if lower == "jpn" || lower == "ja" {
        recognitionLangs = ["ja-JP", "en-US", "zh-Hans"]
    } else if lower == "kor" || lower == "ko" {
        recognitionLangs = ["ko-KR", "en-US"]
    } else if lower == "fre" || lower == "fr" {
        recognitionLangs = ["fr-FR", "en-US"]
    } else if lower == "ger" || lower == "de" {
        recognitionLangs = ["de-DE", "en-US"]
    } else if lower == "spa" || lower == "es" {
        recognitionLangs = ["es-ES", "en-US"]
    } else if lower == "rus" || lower == "ru" {
        recognitionLangs = ["ru-RU", "en-US"]
    }
}
request.recognitionLanguages = recognitionLangs

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
    guard let observations = request.results else {
        exit(0)
    }
    
    // Sort lines top-to-bottom, left-to-right (Vision coords: origin is bottom-left, y goes up)
    let sortedObservations = observations.sorted { (obs1, obs2) -> Bool in
        let y1 = obs1.boundingBox.origin.y
        let y2 = obs2.boundingBox.origin.y
        if abs(y1 - y2) > 0.03 {
            return y1 > y2
        }
        return obs1.boundingBox.origin.x < obs2.boundingBox.origin.x
    }
    
    var lines: [String] = []
    for obs in sortedObservations {
        if let topCandidate = obs.topCandidates(1).first {
            lines.append(topCandidate.string)
        }
    }
    let output = lines.joined(separator: "\n")
    print(output)
} catch {
    fputs("Vision error: \(error.localizedDescription)\n", stderr)
    exit(3)
}
