const Path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// in package.json build script
// the public route to the asset folder
// for building purposes
const ASSET_PATH = process.env.ASSET_PATH || '/';


module.exports = {
  mode: 'none',
  entry: {
    app: Path.resolve(__dirname, '../src/scripts/index.js'),
  },
  output: {
    publicPath: ASSET_PATH,
    path: Path.join(__dirname, '../build'),
    filename: 'js/[name].js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: false,
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({ patterns: [{ from: Path.resolve(__dirname, '../public'), to: 'public' }] }),
    new CopyWebpackPlugin({ patterns: [{ from: Path.resolve(__dirname, '../src/data'), to: 'data' }] }),
    new CopyWebpackPlugin({ patterns: [{ from: Path.resolve(__dirname, '../src/img'), to: 'img' }] }),
    new HtmlWebpackPlugin({
      template: Path.resolve(__dirname, '../src/index.html'),
      favicon: Path.resolve(__dirname, '../src/favicon.ico'),
    }),


  ],
  resolve: {
    alias: {
      '~': Path.resolve(__dirname, '../src'),
    },
  },
  module: {

    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: '[path][name].[ext]'
        }

      },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
    ],
  },
};