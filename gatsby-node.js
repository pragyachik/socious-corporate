require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
})

const path = require("path");

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;
  const blogPostTemplate = path.resolve("src/templates/BlogPost.js");
  const wordpressPostTemplate = path.resolve("src/templates/WordPressBlog.js");

  const result = await graphql(`
    {
      postsRemark: allMarkdownRemark(
        sort: { order: DESC, fields: frontmatter___Date___start }
        filter: { frontmatter: { Publish: { eq: true } } }
      ) {
        edges {
          node {
            frontmatter {
              slug
            }
          }
        }
      }
    }
  `);

  const wordpressResult = await graphql(`
    {
      allWpPost {
        edges {
          node {
            slug
          }
        }
      }
    }  
  `);


  if (result.errors || wordpressResult.errors) {
    reporter.panicOnBuild("Error while running GraphQL query.");
    return;
  }

  const posts = result.data.postsRemark.edges;
  const wordpressPosts = wordpressResult?.data?.allWpPost?.edges || [];

  posts.forEach(({ node }) => {
    createPage({
      path: node.frontmatter.slug,
      component: blogPostTemplate,
      context: {
        slug: node.frontmatter.slug,
      },
    });
  });

  wordpressPosts.forEach(({ node }) => {
    createPage({
      path: `/blog/${node.slug}`,
      component: wordpressPostTemplate,
      context: {
        slug: node.slug,
      },
    });
  });

};

const messages = require("./src/resources/i18n-translations.json");
const { languages, defaultLanguage } = require("./src/resources/i18n");

exports.onCreatePage = async ({ page, actions }) => {
  const { createPage, deletePage } = actions;
  return new Promise((resolve) => {
    let path = page.path;
    deletePage(page);

    for (let language of languages) {
      const isDefaultLanguage = language === defaultLanguage;
      if (!isDefaultLanguage) {
        path = "/" + language + page.path;
      }

      const pageForLanguage = Object.assign({}, page, {
        originalPath: page.path,
        path: path,
        context: {
          language,
          messages: messages[language],
        },
      });
      createPage(pageForLanguage);
    }
    resolve();
  });
};


const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

exports.createResolvers = async (
  {
    actions,
    cache,
    createNodeId,
    createResolvers,
    store,
    reporter,
  },
) => {
  const { createNode } = actions

  await createResolvers({
    WPGraphQL_MediaItem: {
      imageFile: {
        type: "File",
        async resolve(source) {
          let sourceUrl = process.env.WORDPRESS_ENDPOINT + source.sourceUrl

          if (source.mediaItemUrl !== undefined) {
            sourceUrl = source.mediaItemUrl
          }

          return await createRemoteFileNode({
            url: encodeURI(sourceUrl),
            store,
            cache,
            createNode,
            createNodeId,
            reporter,
          })
        },
      },
    },
  })
}
