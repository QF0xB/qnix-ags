{
  description = "My AGS configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      ags,
      ...
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      astalPackages = with ags.packages.${system}; [
        io
        astal4 # or astal3 for gtk3
        # notifd tray wireplumber
        hyprland
        wireplumber
        battery
        tray
        network
        notifd
        bluetooth
        mpris
      ];

      extraPackages = astalPackages ++ [
        pkgs.libadwaita
        pkgs.libsoup_3
      ];
    in
    {
      # Expose helpers for downstream flakes (like qnix-client) and
      # a dev shell for working on the AGS config. We no longer build
      # a bundled binary; this flake is primarily "config as code".
      lib = {
        # Root of this repo; can be used as AGS configDir.
        configDir = self;
        # Extra packages to use when overriding ags in dev shells or elsewhere.
        agsExtraPackages = extraPackages;
      };

      devShells.${system} = {
        default = pkgs.mkShell {
          buildInputs = [
            (ags.packages.${system}.default.override {
              inherit extraPackages;
            })
          ];
        };
      };
    };
}
