import { Result } from "../shared/result.shared";
import { CreateChallengeUseCase } from "@/application/usecases/challenge/createChallenge.usecase";
import { GetChallengesUseCase } from "@/application/usecases/challenge/getChallenges.usecase";
import { DeleteChallengeUseCase } from "@/application/usecases/challenge/deleteChallenge.usecase";
import { ChallengeError } from "@/domain/errors/challenge.errors";
import { MongoChallengeRepository } from "@/infrastructure/repositories/challenge.mongo.repository";
import { NextRequest } from "next/server";

export class ChallengeController {
    constructor(
        private readonly createChallengeUseCase: CreateChallengeUseCase,
        private readonly getChallengesUseCase: GetChallengesUseCase,
        private readonly deleteChallengeUseCase: DeleteChallengeUseCase,
    ) {}

    // private getQueryParams(req: any, query: string) {
    //     const url = new URL(req.url);
    //     const param = url.searchParams.get(query);
    //     // if(!param){
    //     //   throw new BlogError("Params needed")
    //     // }
    //     return param;
    // }

    async createChallenge(req: NextRequest): Promise<Result<ChallengeDTO>> {
        try {
            // await AuthService.getAuthenticatedAdmin(req);
            const { playerTag, deck, wagerAmount, address } = await req.json();
            const timestamp = Date.now();

            const challengeData = {
                playerA: {
                    id: 
                }
            };

            const blog = await this.createBlogUseCase.execute({
                ...blogData,
            });

            return Result.ok(blog);
        } catch (error) {
            if (error instanceof ChallengeError) {
                return Result.fail(error.message, 400);
            }
            return Result.fail("Internal Server Error", 500);
        }
    }

    async getBlogs(req: any): Promise<Result<BlogDTO[]>> {
        try {
            const blogs = await this.getBlogsUseCase.execute(
                this.getQueryParams(req, "blogId") as string,
                this.getQueryParams(req, "slug") as string,
            );

            return Result.ok(blogs);
        } catch (error) {
            if (error instanceof BlogError) {
                return Result.fail(error.message, 400);
            }
            return Result.fail("Internal Server Error", 500);
        }
    }

    async updateBlog(req: any): Promise<Result<BlogDTO>> {
        try {
            await AuthService.getAuthenticatedAdmin(req);
            const blogFormData = await req.formData();

            const s3Client = new S3();
            const timestamp = Date.now();
            let oldResource = await new MongoBlogRepository().get(
                (await this.getQueryParams(req, "blogId")) as string,
            );

            const data = { ...Object.fromEntries(blogFormData) };

            if (data.thumbnail) {
                await s3Client.uploadImageToS3(
                    Buffer.from(
                        await blogFormData.get("thumbnail").arrayBuffer(),
                    ),
                    `blogs/thumbnails/thumbnail_${timestamp}`,
                );
                await s3Client.deleteImageFromS3(
                    oldResource[0].thumbnail as string,
                );
                data.thumbnail =
                    `${process.env.AWS_CLOUDFRONT_URL}/blogs/thumbnails/thumbnail_${timestamp}`;
            }

            if (data.banner) {
                await s3Client.uploadImageToS3(
                    Buffer.from(await blogFormData.get("banner").arrayBuffer()),
                    `blogs/banners/banner_${timestamp}`,
                );
                const ban = await s3Client.deleteImageFromS3(
                    oldResource[0].banner as string,
                );
                data.banner =
                    `${process.env.AWS_CLOUDFRONT_URL}/blogs/banners/banner_${timestamp}`;
            }

            const blogs = await this.updateBlogUseCase.execute(
                (await this.getQueryParams(req, "blogId")) as string,
                data,
            );

            return Result.ok(blogs);
        } catch (error) {
            if (error instanceof BlogError) {
                return Result.fail(error.message, 400);
            }
            return Result.fail("Internal Server Error", 500);
        }
    }

    async deleteBlog(req: any): Promise<Result<BlogDTO>> {
        try {
            await AuthService.getAuthenticatedAdmin(req);
            const blogs = await this.deleteBlogUseCase.execute(
                (await this.getQueryParams(req, "blogId")) as string,
            );

            return Result.ok(blogs);
        } catch (error) {
            if (error instanceof BlogError) {
                return Result.fail(error.message, 400);
            }
            return Result.fail("Internal Server Error", 500);
        }
    }
}
