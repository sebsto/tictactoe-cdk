#!/bin/bash

# check dependency on pandoc
which pandoc > /dev/null
if [ $? != 0 ];
then
    echo 'pandoc must be installed.\nOn Mac, type "brew install pandoc".\nOtherwise check https://pandoc.org'
    exit -1
fi 

# Convert README to GitHub style HTML
pandoc -s -f gfm -c css/github-style.css README.md -o README.html > /dev/null 2>&1 

# Zip everything
FILENAME=tictactoe-infra-cdk-arc-cfn-templates.zip
rm $FILENAME
pushd ..
zip -r $FILENAME tictactoe-cdk -x "*/.git/*" -x "*/node_modules/*" -x "*/cdk.out/*"
popd