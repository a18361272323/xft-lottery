const webpack = require("webpack");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const fs = require("fs");

const STATIC_BASE_URL =
  process.env.STATIC_BASE_URL ||
  "https://cdn.jsdelivr.net/gh/a18361272323/xft-lottery@main/product/dist";

class SrcdocPlugin {
  apply(compiler) {
    compiler.hooks.done.tap("SrcdocPlugin", () => {
      const dist = path.join(__dirname, "dist");
      const indexPath = path.join(dist, "index.html");
      const srcdocPath = path.join(dist, "index.srcdoc.html");

      if (!fs.existsSync(indexPath)) {
        return;
      }

      let html = fs.readFileSync(indexPath, "utf8");
      html = html
        .replace(
          "</head>",
          '<script>window.LOTTERY_STATIC_BASE_URL="' +
            STATIC_BASE_URL +
            '";</script></head>'
        )
        .replace(/(src|href)="(?:\.\/)?(lottery\.js[^"]*)"/g, function (
          match,
          attr,
          file
        ) {
          return attr + '="' + STATIC_BASE_URL + "/" + file + '"';
        })
        .replace(/(src|href)="(?:\.\/)?(lib\/ajax\.js[^"]*)"/g, function (
          match,
          attr,
          file
        ) {
          return attr + '="' + STATIC_BASE_URL + "/" + file + '"';
        })
        .replace(/(src|href)="(?:\.\/)?(data\/[^"]*)"/g, function (
          match,
          attr,
          file
        ) {
          return attr + '="' + STATIC_BASE_URL + "/" + file + '"';
        })
        .replace(/(src|href)="(?:\.\/)?(img\/[^"]*)"/g, function (
          match,
          attr,
          file
        ) {
          return attr + '="' + STATIC_BASE_URL + "/" + file + '"';
        })
        .replace(/\s+crossorigin(="[^"]*")?/g, "");

      fs.writeFileSync(srcdocPath, html);
    });
  }
}

module.exports = {
  entry: path.join(__dirname, "/src/lottery/index.js"),
  output: {
    path: path.join(__dirname, "/dist"),
    filename: "lottery.js"
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        use: {
          loader: "babel-loader"
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          },
          {
            loader: "postcss-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.BannerPlugin("版权所有，翻版必究"),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "/src/index.html"),
      filename: "./index.html",
      minify: {
        // 移除空属性
        removeEmptyAttributes: true,
        // 压缩css
        minifyCSS: true,
        // 压缩JS
        minifyJS: true,
        // 移除空格
        collapseWhitespace: true
      },
      hash: false,
      inject: true
    }),
    new CopyWebpackPlugin([
      {
        from: "./src/css",
        to: "./css"
      },
      {
        from: "./src/data",
        to: "./data"
      },
      {
        from: "./src/img",
        to: "./img"
      },
      {
        from: "./src/lib",
        to: "./lib"
      }
    ]),
    new SrcdocPlugin()
  ]
};
