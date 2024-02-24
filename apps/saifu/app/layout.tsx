import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import theme from './theme';

 export default function RootLayout({children}: {children: React.ReactNode}) {
   return (
     <html lang="en">
       <body style={{backgroundColor: "#111421"}}>
        <AppRouterCacheProvider>
           <ThemeProvider theme={theme}>
              {children}
           </ThemeProvider>
        </AppRouterCacheProvider>
       </body>
     </html>
   );
 }
