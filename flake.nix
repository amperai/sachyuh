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
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "sachyuh-site";
            version = "0.1.1";
            src = ./.;
            installPhase = ''
              mkdir -p $out
              cp -r . $out/
            '';
          };
        });
    };
}
