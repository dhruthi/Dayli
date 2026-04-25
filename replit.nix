{pkgs}: {
  deps = [
    pkgs.libgbm
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.cairo
    pkgs.pango
    pkgs.at-spi2-core
    pkgs.dbus
    pkgs.alsa-lib
    pkgs.mesa
    pkgs.libxkbcommon
    pkgs.expat
    pkgs.libdrm
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
