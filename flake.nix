{
  description = "Live Subtitle — Web Audio API でリアルタイム字幕を表示する Web アプリ";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      cleanSrc = nixpkgs.lib.cleanSourceWith {
        src = ./.;
        filter =
          path: _type:
          let
            base = baseNameOf path;
          in
          !(builtins.elem base [
            "node_modules"
            "dist"
            ".direnv"
            "result"
          ]);
      };
    in
    {
      devShells = forAllSystems (system: {
        default = nixpkgs.legacyPackages.${system}.mkShell {
          packages = [ nixpkgs.legacyPackages.${system}.nodejs_22 ];
          shellHook = ''
            echo "Live Subtitle dev shell — node $(node --version)"
            echo "  npm install && npm run dev"
          '';
        };
      });

      packages = forAllSystems (system: {
        default = nixpkgs.legacyPackages.${system}.buildNpmPackage {
          pname = "live-subtitle";
          version = "0.1.0";
          src = cleanSrc;
          npmDepsHash = "sha256-6bLTtH+rlZeB4M5SryhsAbmT+a61Pgv7hkEmxNAhmaw=";
          npmBuildScript = "build";

          installPhase = ''
            runHook preInstall
            mkdir -p $out/share/live-subtitle
            cp -r dist/. $out/share/live-subtitle/
            runHook postInstall
          '';

          meta = {
            description = "マイク音声を Web Audio API で解析し、リアルタイムに字幕表示する Web アプリ";
            homepage = "https://github.com/";
            license = nixpkgs.lib.licenses.mit;
            platforms = systems;
          };
        };
      });
    };
}
