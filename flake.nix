{
  description = "sachyuh.cz static site";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          site = pkgs.stdenvNoCC.mkDerivation {
            pname = "sachyuh-site";
            version = "0.1.5";
            src = ./.;
            installPhase = ''
              mkdir -p $out
              cp -r . $out/
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
        });
    };
}
