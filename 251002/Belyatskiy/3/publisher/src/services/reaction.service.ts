import { MessageRequestTo, MessageResponseTo } from '../dtos/message.dto.js';
import { Message } from '../entities/message.entity.js';
import { validate } from 'class-validator';
import { getRepository } from 'typeorm';
import {Article} from "../entities/article.entity";

export class MessageService {
    private messageRepository = getRepository(Message);

    async create(messageDto: MessageRequestTo): Promise<MessageResponseTo> {
        const errors = await validate(messageDto);
        if (errors.length > 0) {
            throw new Error('Validation failed');
        }
        const article = await getRepository(Article).findOne({ where: { id: messageDto.articleId } });
        if (!article) {
            const error = new Error('article not found');
            (error as any).status = 404;
            throw error;
        }
        const messageToSave = {
            ...messageDto,
            article
        }
        const message = this.messageRepository.create(messageToSave);
        await this.messageRepository.save(message);
        return {
            id: message.id,
            content: message.content,
            articleId: message.article.id,
        };
    }

    async findAll(page: number = 1, limit: number = 10, sortBy: string = 'id', order: 'ASC' | 'DESC' = 'ASC'): Promise<MessageResponseTo[]> {
        const [messages] = await this.messageRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { [sortBy]: order },
            relations: ['article'],
        });
        return messages.map(message => ({
            id: message.id,
            content: message.content,
            articleId: message.article?.id,
        }));
    }

    async findById(id: number): Promise<MessageResponseTo | undefined> {
        const message = await this.messageRepository.findOne({ where: { id }, relations: ['article'] });
        if (message) {
            return {
                id: message.id,
                content: message.content,
                articleId: message.article.id,
            };
        }
        return undefined;
    }

    async update(messageDto: MessageRequestTo): Promise<MessageResponseTo | undefined> {
        const errors = await validate(messageDto);
        if (errors.length > 0) {
            throw new Error('Validation failed');
        }

        if (!messageDto.id) {
            const error = new Error('Message ID is required for update');
            (error as any).status = 400;
            throw error;
        }

        const message = await this.messageRepository.findOne({
            where: { id: messageDto.id },
            relations: ['article']
        });
        if (!message) {
            const error = new Error('Message not found');
            (error as any).status = 404;
            throw error;
        }

        const article = await getRepository(Article).findOne({ where: { id: messageDto.articleId } });
        if (!article) {
            const error = new Error('Article with this ID does not exist');
            (error as any).status = 404;
            throw error;
        }

        message.content = messageDto.content;
        message.article = article;

        await this.messageRepository.save(message);

        return {
            id: message.id,
            content: message.content,
            articleId: message.article.id,
        };
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.messageRepository.delete(id);
        return result.affected !== null && result.affected !== undefined && result.affected > 0;
    }
}