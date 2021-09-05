#! /bin/bash

aws cloudformation --region us-west-1 delete-stack --stack-name dynamodb-art
aws s3 rm s3://dynamodb-art-sam-$USER
