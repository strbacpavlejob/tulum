import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";
const GoogleIcon = ({ fill = "#fff", ...props }: SvgProps) => {
  return (
    <Svg
      fill="none"
      aria-hidden={true}
      viewBox="0 0 20 20"
      height="20"
      width="20"
      {...props}
    >
      <Path
        fill="#4285F4"
        d="M18.785 10.279c0-.617-.05-1.237-.157-1.843h-8.557v3.493h4.9a4.199 4.199 0 0 1-1.813 2.756v2.267h2.923c1.717-1.58 2.704-3.913 2.704-6.673Z"
      />
      <Path
        fill="#34A853"
        d="M10.072 19.143c2.446 0 4.51-.803 6.013-2.19l-2.924-2.267c-.813.554-1.863.867-3.086.867-2.367 0-4.373-1.597-5.093-3.743H1.965v2.336a9.073 9.073 0 0 0 8.107 4.997Z"
      />
      <Path
        fill="#FBBC04"
        d="M4.978 11.81a5.434 5.434 0 0 1 0-3.473V6H1.965a9.08 9.08 0 0 0 0 8.147l3.013-2.337Z"
      />
      <Path
        fill="#EA4335"
        d="M10.072 4.59a4.93 4.93 0 0 1 3.48 1.36l2.59-2.59A8.719 8.719 0 0 0 10.072 1a9.07 9.07 0 0 0-8.107 5l3.013 2.337c.717-2.15 2.727-3.746 5.094-3.746Z"
      />
    </Svg>
  );
};
export default GoogleIcon;
