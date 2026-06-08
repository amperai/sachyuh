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
        });
    };
}
