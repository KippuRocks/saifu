Pod::Spec.new do |s|
  s.name           = 'SaifuPasskey'
  s.version        = '0.0.0'
  s.summary        = 'Native passkey bridge for Saifu'
  s.description    = 'Creates and uses platform passkeys through ASAuthorization, returning raw WebAuthn outputs.'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Kippu'
  s.homepage       = 'https://github.com/KippuRocks/saifu'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/KippuRocks/saifu.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.swift"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
