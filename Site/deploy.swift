#!/usr/bin/env xcrun swift
import Foundation

enum Deployment: String {
    case Init = "init"
    case Deploy = "deploy"
}

let deployPath = "./_deploy"
let sourcePath = "./source"

for (index, argument) in enumerate(Process.arguments) {
    if let deployment = Deployment(rawValue: argument) {
        switch deployment {
        case .Init:
            // Clear out legacy
            system("rm -rf \(deployPath)")

            // Create deployment dir if needed.
            system("mkdir -p \(deployPath)")

            // Clone gh-pages
            system("git clone git@github.com:mbogh/Tilbagekaldt.git --branch gh-pages --single-branch \(deployPath)")
        case .Deploy:
            // Remove the old
            system("rm -rf \(deployPath)/*")

            // In with the new
            system("cp -r \(sourcePath)/* \(deployPath)/")

            // Move to deploy directory
            let moveCommand = "cd \(deployPath) && git status"

            // Commit changes
            let commitMessage = "Build \(NSDate())"
            let commitCommand = "git add --all && git commit -m \"\(commitMessage)\""

            // Push
            let pushCommand = "git push"

            // Execute commands
            system("\(moveCommand) && \(commitCommand) && \(pushCommand)")
        }
    }
}