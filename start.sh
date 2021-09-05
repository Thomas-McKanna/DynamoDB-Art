#! /bin/bash

suffix=$(echo $USER)

aws s3 mb s3://dynamodb-art-sam-$suffix --region us-west-1

sam build
sam deploy --stack-name dynamodb-art \
    --region us-west-1 \
    --capabilities CAPABILITY_IAM \
    --s3-bucket dynamodb-art-sam-$suffix \
    --s3-prefix dynamodb-art \
    --no-confirm-changeset

api_base=$(aws cloudformation describe-stacks --stack-name dynamodb-art --query 'Stacks[0].Outputs[?OutputKey==`ApiBase`].OutputValue' --output text)

python replace_api_base.py $api_base

cd frontend

echo "You can now view the running web app at: localhost:8000"

python -m http.server 8000 --bind localhost
