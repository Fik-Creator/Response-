import "./globals.css";
export const metadata={title:"Transport OOU",description:"Verified transport and boarding for OOU students.",manifest:"/manifest.webmanifest",icons:{icon:"/transport-oou-mark.svg",apple:"/transport-oou-mark.svg"}};
export const viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#073B8C"};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}