import * as React from "react";
import Svg, { Defs, G, Path, SvgProps } from "react-native-svg";

const Blob = ({ width, height = 471, color, ...props }: SvgProps) => (
  <Svg width={width} height={height} fill="none" {...props}>
    <G filter="url(#a)">
      <Path
        fill={color}
        d="M325.854 339.792c98.795-15.461 63.496-122.74 60.997-181.568V-3h-396.98l-73.996 105.279c-4 32.041 0 142.915 139.993 142.915 129.334 0 146.492 113.925 269.986 94.598Z"
      />
    </G>
    <Defs></Defs>
  </Svg>
);
export default Blob;
