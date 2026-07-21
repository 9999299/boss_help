const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// 读取 src/config.js 中的 API key
let apiKey = '';
try {
  const configContent = fs.readFileSync('./src/config.js', 'utf8');
  const match = configContent.match(/AI_API_KEY\s*=\s*['"](.+?)['"]/);
  if (match) apiKey = match[1];
} catch {
  // config.js 不存在时使用空值
}

module.exports = {
  entry: {
    sidebar: './src/index.jsx',
    content: './src/content.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'classic' }]]
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __API_KEY__: JSON.stringify(apiKey)
    }),
    new HtmlWebpackPlugin({
      template: './public/sidebar.html',
      filename: 'sidebar.html',
      chunks: ['sidebar']
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};