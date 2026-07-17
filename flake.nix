{
  description = "sachyuh.cz static site";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, rust-overlay }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          overlays = [ (import rust-overlay) ];
          pkgs = import nixpkgs { inherit system overlays; };
          rustToolchain = pkgs.rust-bin.stable.latest.default;

          site = pkgs.stdenvNoCC.mkDerivation {
            pname = "sachyuh-site";
            version = "1.1.3";
            src = ./.;
            installPhase = ''
              mkdir -p $out
              cp -r . $out/
            '';
          };

          sachyuhTurnajRust = pkgs.rustPlatform.buildRustPackage {
            pname = "sachyuh-turnaj-rust";
            version = "0.1.0";
            src = ./.;
            cargoLock.lockFile = ./Cargo.lock;

            nativeBuildInputs = with pkgs; [ pkg-config ];
            buildInputs = with pkgs; [ openssl ];

            CARGO_BUILD_JOBS = "1";
            NIX_BUILD_CORES = "1";
            enableParallelBuilding = false;

            postInstall = ''
              mkdir -p $out/share/sachyuh-turnaj-rust
              cp turnaj_rust/index.html          $out/share/sachyuh-turnaj-rust/
              cp turnaj_rust/turnaj_meta.js       $out/share/sachyuh-turnaj-rust/
              cp turnaj/styles.css               $out/share/sachyuh-turnaj-rust/
              cp turnaj/app.js                   $out/share/sachyuh-turnaj-rust/
              cp turnaj/ratings.js               $out/share/sachyuh-turnaj-rust/
              cp turnaj/tournament.js            $out/share/sachyuh-turnaj-rust/
            '';
          };

          # bbpPairings prebuilt binary (x86_64-linux only)
          bbpPairings = pkgs.stdenv.mkDerivation {
            name = "bbpPairings-6.0.0";
            src = pkgs.fetchurl {
              url = "https://github.com/BieremaBoyzProgramming/bbpPairings/releases/download/v6.0.0/bbpPairings-v6.0.0-x86_64-pc-linux.tar.gz";
              hash = "sha256-v/0tWk3J2G6z2YhjOejKRG2IaD93VZ8IieoNIEDn2Cc=";
            };
            nativeBuildInputs = [ pkgs.autoPatchelfHook ];
            buildInputs = [ pkgs.glibc ];
            installPhase = ''
              mkdir -p $out/bin
              cp bbpPairings.exe $out/bin/bbpPairings
              chmod +x $out/bin/bbpPairings
            '';
          };

          # Turnaj2 static site (pairing GUI)
          turnaj2Site = pkgs.stdenvNoCC.mkDerivation {
            pname = "sachyuh-turnaj2-site";
            version = "1.0.0";
            src = ./turnaj2;
            buildPhase = ":";
            installPhase = ''
              mkdir -p $out
              cp pairing.html pairing.css pairing.js $out/
            '';
          };

          # Turnaj2 Python API server (bbpPairings bridge)
          turnaj2Server = pkgs.stdenv.mkDerivation {
            pname = "sachyuh-turnaj2-server";
            version = "1.0.0";
            src = ./turnaj2;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            buildPhase = ":";
            installPhase = ''
              mkdir -p $out/lib/turnaj2/server $out/bin
              cp server/local_server.py server/bbp_bridge.py $out/lib/turnaj2/server/
              makeWrapper ${pkgs.python3}/bin/python3 $out/bin/sachyuh-turnaj2-server \
                --add-flags "$out/lib/turnaj2/server/local_server.py" \
                --set BBP_PAIRINGS_EXE "${bbpPairings}/bin/bbpPairings" \
                --set PYTHONPATH "$out/lib/turnaj2/server"
            '';
          };

          # Turnaj3 static site (pairing GUI — osel-pairing)
          turnaj3Site = pkgs.stdenvNoCC.mkDerivation {
            pname = "sachyuh-turnaj3-site";
            version = "1.0.0";
            src = ./turnaj3;
            buildPhase = ":";
            installPhase = ''
              mkdir -p $out
              cp pairing.html pairing.css pairing.js $out/
            '';
          };

          # Turnaj3 Python API server (bbpPairings bridge)
          turnaj3Server = pkgs.stdenv.mkDerivation {
            pname = "sachyuh-turnaj3-server";
            version = "1.0.0";
            src = ./turnaj3;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            buildPhase = ":";
            installPhase = ''
              mkdir -p $out/lib/turnaj3/server $out/bin
              cp server/local_server.py server/bbp_bridge.py server/round_robin.py $out/lib/turnaj3/server/
              makeWrapper ${pkgs.python3}/bin/python3 $out/bin/sachyuh-turnaj3-server \
                --add-flags "$out/lib/turnaj3/server/local_server.py" \
                --set BBP_PAIRINGS_EXE "${bbpPairings}/bin/bbpPairings" \
                --set PYTHONPATH "$out/lib/turnaj3/server"
            '';
          };
        in
        {
          default = site;
          server = pkgs.writeShellApplication {
            name = "sachyuh-turnaj-server";
            runtimeInputs = [ pkgs.nodejs_24 ];
            text = ''
              export SACHYUH_DB_DIR="''${SACHYUH_DB_DIR:-$PWD/db}"
              exec node ${site}/turnaj/server.js
            '';
          };
          rust-server = sachyuhTurnajRust;
          turnaj2 = turnaj2Site;
          turnaj2-server = turnaj2Server;
          turnaj3 = turnaj3Site;
          turnaj3-server = turnaj3Server;
        });
    };
}
