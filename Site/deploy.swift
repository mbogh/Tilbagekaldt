#!/usr/bin/env xcrun swift

import Foundation

let deployPath = "./_deploy"
let sourcePath = "./source"

system("rm -rf \(deployPath)/*")
system("cp -r \(sourcePath)/* \(deployPath)/")
