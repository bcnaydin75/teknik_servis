/** iOS PWA: apple-touch-startup-image — yoksa ilk açılışta beyaz ekran */
const SPLASHES: Array<{
  href: string;
  media: string;
}> = [
  // iPhone SE (1st), 5/5s/5c
  {
    href: "/splashes/apple-splash-640-1136.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  // iPhone 8 / SE (2nd/3rd)
  {
    href: "/splashes/apple-splash-750-1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  // iPhone 8 Plus
  {
    href: "/splashes/apple-splash-1242-2208.png",
    media:
      "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone X / XS / 11 Pro
  {
    href: "/splashes/apple-splash-1125-2436.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone XR / 11
  {
    href: "/splashes/apple-splash-828-1792.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  // iPhone XS Max / 11 Pro Max
  {
    href: "/splashes/apple-splash-1242-2688.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 12/13/14 / 16
  {
    href: "/splashes/apple-splash-1170-2532.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 12/13/14 Pro Max
  {
    href: "/splashes/apple-splash-1284-2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 12/13 mini
  {
    href: "/splashes/apple-splash-1080-2340.png",
    media:
      "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 14 Pro / 15 Pro / 16
  {
    href: "/splashes/apple-splash-1179-2556.png",
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 14 Plus / 15 Plus / 15 Pro Max / 16 Plus
  {
    href: "/splashes/apple-splash-1290-2796.png",
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 16 Pro
  {
    href: "/splashes/apple-splash-1206-2622.png",
    media:
      "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 16 Pro Max
  {
    href: "/splashes/apple-splash-1320-2868.png",
    media:
      "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  // iPhone 16 Plus alt
  {
    href: "/splashes/apple-splash-1260-2736.png",
    media:
      "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
];

export default function AppleSplashLinks() {
  return (
    <>
      {SPLASHES.map((s) => (
        <link
          key={s.href + s.media}
          rel="apple-touch-startup-image"
          href={s.href}
          media={s.media}
        />
      ))}
    </>
  );
}
