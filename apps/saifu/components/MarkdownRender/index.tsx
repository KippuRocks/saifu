import { Box, Typography } from "@mui/material";
import Markdown, { ReactRenderer } from "marked-react";

export function MarkdownRender({ children }: { children: React.ReactNode }) {
  const renderer: Partial<ReactRenderer> = {
    heading(children, level) {
      let variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" = `h${level}`;
      return (
        <Typography variant={variant} color="white">
          {children}
        </Typography>
      );
    },
    paragraph(children) {
      return (
        <Typography variant="body1" color="white">
          {children}
        </Typography>
      );
    },
    html(nodeText) {
      return (
        <Box
          width="100vw"
          dangerouslySetInnerHTML={{ __html: nodeText!.toString() }}
        />
      );
    },
  };

  return (
    <Markdown gfm renderer={renderer}>
      {children?.toString()}
    </Markdown>
  );
}
