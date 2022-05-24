const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader?fix=true']
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [
                require('postcss-nested-ancestors'),
                require('postcss-nested')
              ]
            }
          }
        ]
      },
      {
        test: /toolbox\.svg$/,
        loader: 'svg-inline-loader?removeSVGTagAttrs=false'
      },
      {
        test: /(ic_star_off|ic_star_on)\.svg$/,
        loader: 'svg-url-loader',
        exclude: /toolbox\.svg$/,
      }
    ]
  },
  output: {
    path: path.join(__dirname, '/dist'),
    publicPath: '/',
    filename: 'bundle.js',
    library: 'LinkTool',
    libraryExport: 'default',
    libraryTarget: 'umd'
  }
};
